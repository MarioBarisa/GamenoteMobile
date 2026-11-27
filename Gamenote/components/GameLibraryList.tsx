import {useCallback, useRef, useState} from "react";
import {FlatList, StyleSheet, View, useWindowDimensions, type FlatListProps, type LayoutChangeEvent} from "react-native";
import {SafeAreaView, useSafeAreaInsets} from "react-native-safe-area-context";
import type {Game} from "@/common/Game";
import GameCard from "@/components/GameCard";
import GameCardCompact from "@/components/GameCardCompact";
import {GameCardSkeleton, GameCardCompactSkeleton} from "@/components/GameCardSkeleton";
import {useTheme} from "@/context/theme";

const GAP = 12;
const keyExtractor = (game: Game) => game.db_id ?? game.game_id;

function gridLayout(width: number, compact: boolean) {
    const contentWidth = Math.max(0, Math.min(width - 32, compact ? 1040 : 540));
    const columns = compact ? Math.max(1, Math.min(4, Math.floor((contentWidth + GAP) / 162))) : 1;
    const cardWidth = (contentWidth - (columns - 1) * GAP) / columns;
    return {columns, cardWidth, horizontalPadding: (width - contentWidth) / 2};
}

type Props = Pick<FlatListProps<Game>, "ListHeaderComponent" | "ListFooterComponent" | "refreshControl"> & {
    games: Game[];
    compact: boolean;
    onDelete: (id: string) => Promise<void>;
    showSkeleton?: boolean;
};

function RowSeparator() {
    return <View style={styles.separator}/>;
}

export default function GameLibraryList({games, compact, onDelete, showSkeleton, ...props}: Props) {
    const {themeColors} = useTheme();
    const {width: windowWidth} = useWindowDimensions();
    const {left, right} = useSafeAreaInsets();
    const [viewport, setViewport] = useState({width: windowWidth - left - right, firstRow: 0});
    const {columns, cardWidth, horizontalPadding} = gridLayout(viewport.width, compact);
    const firstRow = Math.max(0, Math.min(viewport.firstRow, Math.ceil(games.length / columns) - 1));
    const list = useRef<FlatList<Game>>(null);
    const firstVisible = useRef<string | null>(null);
    const restoringRow = useRef<number | null>(null);

    const renderCell = useCallback<NonNullable<FlatListProps<Game>["CellRendererComponent"]>>(({index, children, style, onFocusCapture, onLayout}) => (
        <View style={style} onFocusCapture={onFocusCapture} onLayout={event => {
            onLayout?.(event);
            if (restoringRow.current !== index) return;
            restoringRow.current = null;
            list.current?.scrollToIndex({index, animated: false});
        }}>{children}</View>
    ), []);

    const trackVisible = useCallback<NonNullable<FlatListProps<Game>["onViewableItemsChanged"]>>(({viewableItems}) => {
        if (viewableItems.length) firstVisible.current = viewableItems[0].key;
    }, []);

    function onLayout(event: LayoutChangeEvent) {
        const {width} = event.nativeEvent.layout;
        if (width <= 0 || width === viewport.width) return;
        const next = gridLayout(width, compact);
        if (next.columns !== columns) restoringRow.current = null;
        const visibleKey = firstVisible.current;
        const item = next.columns === columns ? -1 : games.findIndex(game => keyExtractor(game) === visibleKey);
        setViewport({width, firstRow: Math.max(0, Math.floor(item / next.columns))});
    }

    return (
        <SafeAreaView edges={["left", "right"]} style={[styles.fill, {backgroundColor: themeColors.background}]}>
            <View style={styles.fill} onLayout={onLayout}>
                <FlatList
                    {...props}
                    ref={list}
                    key={columns}
                    data={games}
                    keyExtractor={keyExtractor}
                    numColumns={columns}
                    style={styles.fill}
                    contentContainerStyle={{flexGrow: 1, paddingHorizontal: horizontalPadding, paddingVertical: 16}}
                    contentInsetAdjustmentBehavior="automatic"
                    initialNumToRender={compact ? 5 : 4}
                    windowSize={7}
                    columnWrapperStyle={columns > 1 ? styles.row : undefined}
                    ItemSeparatorComponent={compact ? RowSeparator : undefined}
                    initialScrollIndex={firstRow || undefined}
                    CellRendererComponent={renderCell}
                    onScrollBeginDrag={() => { restoringRow.current = null; }}
                    onScrollToIndexFailed={({index, averageItemLength}) => {
                        restoringRow.current = index;
                        const rowHeight = averageItemLength || cardWidth * 4 / 3 + 112;
                        list.current?.scrollToOffset({offset: index * rowHeight, animated: false});
                    }}
                    onViewableItemsChanged={trackVisible}
                    renderItem={({item}) => compact
                        ? <GameCardCompact game={item} width={cardWidth} onDelete={onDelete}/>
                        : <GameCard game={item} width={cardWidth} onDelete={onDelete}/>}
                    ListEmptyComponent={showSkeleton ? (
                        compact ? (
                            <View style={[styles.row, styles.skeletons]}>
                                {Array.from({length: 6}, (_, index) => <GameCardCompactSkeleton key={index} width={cardWidth}/>)}
                            </View>
                        ) : (
                            <>{Array.from({length: 4}, (_, index) => <GameCardSkeleton key={index}/>)}</>
                        )
                    ) : undefined}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    fill: {flex: 1},
    row: {gap: GAP},
    separator: {height: GAP},
    skeletons: {flexDirection: "row", flexWrap: "wrap"},
});
