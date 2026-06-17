import {
    Alert, Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from 'react-native';
import {useLocalSearchParams, useRouter} from "expo-router";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {Game} from "@/common/Game";
import {useState} from "react";
import {SymbolView} from "expo-symbols";
import DateTimePicker, {DateTimePickerEvent} from "@react-native-community/datetimepicker";
import {useUserGames} from "@/hooks/useUserGames";
import {useGroups} from "@/context/GroupsContext";
import {STATUS_CONFIG, GAME_STATUSES} from "@/common/StatusCommons";
import * as Haptics from 'expo-haptics';
import {PROGRESS_MODES} from "@/common/ProgressSources";
import {useTranslation} from "react-i18next";

export default function AddGameModal() {
    const {t: tr} = useTranslation();
    const {game: gameParam} = useLocalSearchParams<{ game: string }>();
    const router = useRouter();
    const {theme} = useTheme();
    const t = colors[theme];
    const {addGame} = useUserGames();
    const {groups, addGameToGroup} = useGroups();

    const ravgGame: Partial<Game> = (() => {
        try {
            return gameParam ? JSON.parse(gameParam) : {};
        } catch {
            return {};
        }
    })();

    const [form, setForm] = useState<Partial<Game>>({
        status: undefined,
        rating: undefined,
        play_time: undefined,
        notes: undefined,
        start_date: undefined,
        end_date: undefined,
        progress_value: undefined,
        progress_total: 100,
        platform: undefined,
        progress_mode: undefined,
    });
    const [includeDescription, setIncludeDescription] = useState(false);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

    const patch = (key: keyof Game, value: any) => setForm(prev => ({...prev, [key]: value}));

    const validate = (): boolean => {
        const missing: string[] = [];
        if (!form.status) missing.push(tr('editGame.statusLabel'));
        if (!form.platform) missing.push(tr('editGame.platformLabel'));
        if (missing.length > 0) {
            Alert.alert(tr('addGame.requiredAlert'), missing.join('\n'));
            return false;
        }
        if (form.progress_value !== undefined && form.progress_total !== undefined && form.progress_value > form.progress_total) {
            Alert.alert(tr('editGame.errorTitle'), tr('editGame.achievementsError'));
            return false;
        }
        return true;
    };

    const handleAdd = async () => {
        if (!validate()) return;

        const completeGame: Game = {
            title: ravgGame.title ?? '',
            game_id: ravgGame.game_id ?? '',
            image_url: ravgGame.image_url,
            background_image: ravgGame.background_image,
            screenshot_urls: ravgGame.screenshot_urls,
            genre: ravgGame.genre,
            publisher: ravgGame.publisher,
            releaseDate: ravgGame.releaseDate ?? '',
            metacriticScore: ravgGame.metacriticScore ?? 0,
            esrbRating: ravgGame.esrbRating,
            about: includeDescription ? ravgGame.about ?? '' : undefined,
            webPage: ravgGame.webPage ?? '',
            series: ravgGame.series,
            platform: form.platform,
            status: form.status,
            play_time: form.play_time,
            rating: form.rating,
            notes: form.notes,
            start_date: form.start_date,
            end_date: form.end_date,
            progress_value: form.progress_value,
            progress_total: form.progress_total ?? 100,
            progress_mode: form.progress_mode,
        };

        try {
            await addGame(completeGame);
            for (const groupId of selectedGroupIds) {
                await addGameToGroup(completeGame.game_id, groupId);
            }
            Alert.alert(tr('addGame.addedTitle'), tr('addGame.addedMsg', {title: completeGame.title}), [
                {text: 'OK', onPress: () => router.back()}
            ]);
        } catch {
            Alert.alert(tr('editGame.errorTitle'), tr('editGame.achievementsError'));
        }
    };

    const parseDate = (iso?: string) => iso ? new Date(iso) : new Date();

    const PLATFORMS = [
        'PlayStation 5', 'PlayStation 4',
        'Xbox Series X/S', 'Xbox One',
        'Nintendo Switch', 'Nintendo Switch 2',
        'PC', 'iOS', 'Android', 'Other'
    ] as const;

    return (
        <ScrollView contentContainerStyle={{gap: 10, padding: 8}}
                    style={{backgroundColor: t.backgroundModal}}
                    contentInsetAdjustmentBehavior="automatic"
                    automaticallyAdjustContentInsets={true}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets={true}
        >
            <View style={[styles.card, {
                backgroundColor: t.card,
                borderColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
            }]}>
                <View style={{padding: 16}}>
                    <Text style={{color: t.text, fontSize: 22, fontWeight: '800'}} numberOfLines={2}>
                        {ravgGame.title}
                    </Text>
                    {ravgGame.releaseDate ? (
                        <Text style={{color: t.secondaryText, fontSize: 14, marginTop: 4}}>
                            {ravgGame.releaseDate}
                        </Text>
                    ) : null}
                </View>
            </View>

            <View style={styles.section}>
                <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.ratingLabel')}</Text>
                    {[1, 2, 3, 4, 5].map(star => (
                        <Pressable key={star}
                                   onPress={() => patch('rating', star === form.rating ? undefined : star)}
                                   hitSlop={8}>
                            <SymbolView
                                name={star <= (form.rating ?? 0) ? 'star.fill' : 'star'}
                                style={{width: 32, height: 32}}
                                tintColor={star <= (form.rating ?? 0) ? '#FF9F0A' : t.secondaryText}
                            />
                        </Pressable>
                    ))}
                </View>

                <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8, alignItems: 'center'}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.startDateLabel')}</Text>
                    <DateTimePicker
                        value={parseDate(form.start_date)}
                        mode="date"
                        display="compact"
                        onChange={(e: DateTimePickerEvent, date?: Date) => {
                            if (date) patch('start_date', date.toISOString().split('T')[0]);
                        }}
                        maximumDate={new Date()}
                    />
                </View>

                <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8, alignItems: 'center'}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.endDateLabel')}</Text>
                    <DateTimePicker
                        value={parseDate(form.end_date)}
                        mode="date"
                        display="compact"
                        onChange={(e: DateTimePickerEvent, date?: Date) => {
                            if (date) patch('end_date', date.toISOString().split('T')[0]);
                        }}
                        maximumDate={new Date()}
                    />
                </View>

                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.platformLabel')}</Text>
                    <Pressable
                        onPress={() => Alert.alert(
                            tr('editGame.platformPickerTitle'),
                            undefined,
                            [
                                ...PLATFORMS.map(p => ({
                                    text: p,
                                    onPress: () => patch('platform', p),
                                })),
                                {text: tr('common.cancel'), style: 'cancel'},
                            ]
                        )}
                        style={{flexDirection: 'row', alignItems: 'center', gap: 6}}
                    >
                        <Text style={{color: t.text, fontSize: 15, fontWeight: '500'}}>
                            {form.platform ?? tr('editGame.platformDefault')}
                        </Text>
                        <SymbolView name="chevron.up.chevron.down" style={{width: 14, height: 14}}
                                    tintColor={t.accent}/>
                    </Pressable>
                </View>

                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.progressLabel')}</Text>
                    <Pressable
                        onPress={() =>
                            Alert.alert(tr('editGame.progressPickerTitle'), undefined, [
                                ...PROGRESS_MODES.map(m => ({
                                    text: m.label,
                                    onPress: () => patch('progress_mode', m.key),
                                })),
                                {text: tr('common.cancel'), style: "cancel"},
                            ])} style={{flexDirection: "row", alignItems: "center", gap: 6}}>
                        <Text style={{color: t.text, fontSize: 16, fontWeight: '500'}}>
                            {form.progress_mode ? PROGRESS_MODES.find(m => m.key === form.progress_mode)?.label : tr('editGame.progressDefault')}
                        </Text>
                        <SymbolView name="chevron.up.chevron.down" style={{width: 14, height: 14}}
                                    tintColor={t.accent}/>
                    </Pressable>
                </View>

                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.achievementsLabel')}</Text>
                    <TextInput style={[styles.numInput, {
                        color: t.text,
                        backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'
                    }]}
                               value={form.progress_value?.toString() ?? ''}
                               onChangeText={v => patch('progress_value', v === '' ? undefined : parseInt(v))}
                               keyboardType="numeric"
                               placeholder={tr('editGame.achievementPlaceholder')}
                               placeholderTextColor={t.secondaryText}
                               maxLength={4}/>
                    <Text style={{color: t.secondaryText, fontSize: 18}}>/</Text>
                    <TextInput style={[styles.numInput, {
                        color: t.text,
                        backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'
                    }]}
                               value={form.progress_total?.toString() ?? ''}
                               onChangeText={v => patch('progress_total', v === '' ? undefined : parseInt(v))}
                               keyboardType="numeric"
                               placeholder={tr('editGame.achievementPlaceholder')}
                               placeholderTextColor={t.secondaryText}
                               maxLength={4}/>
                </View>

                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.playtimeLabel')}</Text>
                    <TextInput style={[styles.input, {
                        color: t.text,
                        backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'
                    }]}
                               value={form.play_time?.toString() ?? ''}
                               onChangeText={v => patch('play_time', v === '' ? undefined : parseInt(v))}
                               keyboardType="number-pad"
                               placeholder={tr('editGame.playtimePlaceholder')}
                               placeholderTextColor={t.secondaryText}/>
                </View>

                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.statusLabel')}</Text>
                    <Pressable
                        onPress={() => Alert.alert(
                            tr('editGame.statusPickerTitle'),
                            undefined,
                            [
                                ...GAME_STATUSES.map(status => ({
                                    text: STATUS_CONFIG[status].label,
                                    onPress: () => patch('status', status),
                                })),
                                {text: tr('common.cancel'), style: 'cancel'},
                            ]
                        )}
                        style={{flexDirection: 'row', alignItems: 'center', gap: 6}}
                    >
                        <Text style={{color: t.text, fontSize: 15, fontWeight: '500'}}>
                            {form.status ? STATUS_CONFIG[form.status].label : tr('editGame.statusDefault')}
                        </Text>
                        <SymbolView name="chevron.up.chevron.down" style={{width: 14, height: 14}}
                                    tintColor={t.accent}/>
                    </Pressable>
                </View>

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('addGame.includeDescription')}</Text>
                    <Switch
                        value={includeDescription}
                        onValueChange={setIncludeDescription}
                        trackColor={{false: t.secondaryText, true: t.accent}}
                    />
                </View>

                <View style={{flexDirection: 'column', gap: 6, paddingVertical: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('addGame.groupsSection')}</Text>
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                        {groups.map(group => {
                            const selected = selectedGroupIds.includes(group.id);
                            return (
                                <Pressable
                                    key={group.id}
                                    onPress={() => {
                                        setSelectedGroupIds(prev =>
                                            prev.includes(group.id)
                                                ? prev.filter(id => id !== group.id)
                                                : [...prev, group.id]
                                        );
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 16,
                                        backgroundColor: selected ? t.accent : (theme === 'dark' ? '#2C2C2E' : '#E5E5EA'),
                                    }}
                                >
                                    <Text style={{color: selected ? '#fff' : t.text, fontSize: 13, fontWeight: '600'}}>
                                        {group.name}
                                    </Text>
                                    {selected && (
                                        <SymbolView name="checkmark" style={{width: 14, height: 14}} tintColor="#fff"/>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <Text style={[styles.label, {color: t.text}]}>{tr('editGame.notesLabel')}</Text>
                <TextInput style={[styles.notesInput, {
                    color: t.text,
                    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'
                }]}
                           value={form.notes ?? ''}
                           onChangeText={v => patch('notes', v)}
                           multiline={true}
                           numberOfLines={10}
                           placeholder={tr('editGame.notesPlaceholder')}
                           placeholderTextColor={t.secondaryText}
                           textAlignVertical="top"/>

                <Pressable
                    onPress={() => {
                        handleAdd();
                        if (Platform.OS === 'ios') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                    }}
                    accessibilityLabel={tr('addGame.addButton')}
                    style={[styles.saveButton, {backgroundColor: t.accent}]}
                >
                    <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>{tr('addGame.addButton')}</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 3},
        elevation: 2,
    },
    section: {
        marginHorizontal: 16,
        marginTop: 10,
        gap: 8,
    },
    label: {
        fontSize: 18,
        fontWeight: '700',
    },
    input: {
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        flex: 1,
    },
    numInput: {
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        minWidth: 60,
        maxWidth: 80,
        textAlign: 'center',
    },
    notesInput: {
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        minHeight: 100,
    },
    saveButton: {
        margin: 16,
        padding: 16,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 32,
    },
});
