import {FlatList, ScrollView, type FlatListProps, type ScrollViewProps, type ViewProps} from "react-native";
import {SafeAreaView} from "react-native-screens/experimental";

type ScreenBackground = {backgroundColor: string};

export function ScreenViewport({backgroundColor, style, children}: ScreenBackground & ViewProps) {
    return (
        <SafeAreaView edges={{left: true, right: true}} style={[{backgroundColor}, style]}>
            {children}
        </SafeAreaView>
    );
}

export function ScreenScrollView({backgroundColor, ...props}: ScreenBackground & ScrollViewProps) {
    return (
        <ScreenViewport backgroundColor={backgroundColor}>
            <ScrollView contentInsetAdjustmentBehavior="automatic" {...props}/>
        </ScreenViewport>
    );
}

export function ScreenFlatList<Item>({backgroundColor, ...props}: ScreenBackground & FlatListProps<Item>) {
    return (
        <ScreenViewport backgroundColor={backgroundColor}>
            <FlatList contentInsetAdjustmentBehavior="automatic" {...props}/>
        </ScreenViewport>
    );
}
