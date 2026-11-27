import {ModalInput} from "@/components/AccountModal";
import {screenContent} from "@/constants/layout";
import {useLocalMode} from "@/context/localMode";
import {
    Alert, Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import {useLocalSearchParams, useRouter} from "expo-router";
import {useTheme} from "@/context/theme";
import {Game} from "@/common/Game";
import {useState} from "react";
import {SymbolView} from "expo-symbols";
import DateTimePicker from "@react-native-community/datetimepicker";
import {GameNotFoundError, useUserGames} from "@/hooks/useUserGames";
import {useGroups} from "@/context/GroupsContext";
import {STATUS_CONFIG, GAME_STATUSES} from "@/common/StatusCommons";
import * as Haptics from 'expo-haptics';
import {PROGRESS_MODES} from "@/common/ProgressSources";
import {useTranslation} from "react-i18next";
import SelectMenu from "@/components/SelectMenu";


export default function ModalEdit() {
    const {t: tr} = useTranslation();
    const {game: gameParam} = useLocalSearchParams<{ game: string }>();
    const router = useRouter();
    const {theme, themeColors: t} = useTheme();
    const {updateGame} = useUserGames();
    const {activeSource, document} = useLocalMode();
    const {groups, addGameToGroup, removeGameFromGroup, getGroupsForGame} = useGroups();

    const original: Game = (() => {
        try {
            return gameParam ? JSON.parse(gameParam) : {}
        } catch {
            return {}
        }
    })();

    const [form, setForm] = useState<Partial<Game>>({
        title: original.title,
        status: original.status,
        rating: original.rating,
        play_time: original.play_time,
        notes: original.notes,
        start_date: original.start_date,
        end_date: original.end_date,
        progress_value: original.progress_value,
        progress_total: original.progress_total,
        platform: original.platform,
        progress_mode: original.progress_mode,
    });

    const patch = (key: keyof Game, value: any) => setForm(prev => ({...prev, [key]: value}));

    const parseDate = (iso?: string) => iso ? new Date(iso) : new Date();

    const initialGroupIds = getGroupsForGame(original.db_id ?? original.game_id).map(g => g.id);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialGroupIds);

    const handleSave = async () => {
        if (activeSource === "local" && !form.title?.trim()) {
            Alert.alert(tr("addGame.requiredAlert"), tr("screens.localMode.gameTitle"));
            return;
        }
        if (form.progress_value !== undefined && form.progress_total !== undefined && form.progress_value > form.progress_total) {
            Alert.alert(tr('editGame.errorTitle'), tr('editGame.achievementsError'));
            return;
        }
        const toRemove = initialGroupIds.filter(id => !selectedGroupIds.includes(id));
        const toAdd = selectedGroupIds.filter(id => !initialGroupIds.includes(id));
        if (activeSource === "local") {
            if (!original.db_id) {
                Alert.alert(tr("gameDetails.notFound"));
                return;
            }
            try {
                await updateGame(original.db_id, {...form, title: form.title?.trim()}, {add: toAdd, remove: toRemove});
            } catch {
                Alert.alert(tr("screens.localMode.storageError"));
                return;
            }
        } else {
            if (!original.game_id) {
                Alert.alert(tr("gameDetails.notFound"));
                return;
            }
            const gameId = original.db_id ?? original.game_id;
            const {title: _title, ...changes} = form;
            try {
                await updateGame(original.game_id, changes);
                for (const id of toRemove) await removeGameFromGroup(gameId, id);
                for (const id of toAdd) await addGameToGroup(gameId, id);
            } catch (error) {
                if (error instanceof GameNotFoundError) {
                    Alert.alert(tr("gameDetails.notFound"), tr("editGame.gameRemoved"), [{text: "OK", onPress: () => router.back()}]);
                } else {
                    Alert.alert(tr("editGame.errorTitle"), tr("editGame.saveError"));
                }
                return;
            }
        }
        Alert.alert(tr('editGame.savedTitle'), tr('editGame.savedMsg', {title: original.title}), [
            {text: 'OK', onPress: () => router.back()}
        ]);
    }

    const PLATFORMS = activeSource === "local" ? [...new Set([...(document?.platforms ?? []), ...(original.platform ? [original.platform] : [])])] : [
        'PlayStation 5', 'PlayStation 4',
        'Xbox Series X/S', 'Xbox One',
        'Nintendo Switch', 'Nintendo Switch 2',
        'PC', 'iOS', 'Android', 'Other'
    ] as const;

    return (

        <ScrollView contentContainerStyle={[screenContent.form, {gap: 10, padding: 8}]}
                    style={{backgroundColor: t.backgroundModal}}
                    contentInsetAdjustmentBehavior="automatic"
                    automaticallyAdjustContentInsets={true}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets={true}
        >
            <View style={styles.section}>
                {activeSource === "local" && <ModalInput value={form.title} onChangeText={text => patch("title", text)}
                    accessibilityLabel={tr("screens.localMode.gameTitle")} placeholder={tr("screens.localMode.gameTitle")} maxLength={160}/>}
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
                <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.startDateLabel')}</Text>
                    <DateTimePicker
                        value={parseDate(form.start_date)}
                        mode="date"
                        display="compact"
                        onValueChange={(_e, date) => {
                            patch('start_date', date.toISOString().split('T')[0]);
                        }}
                        maximumDate={new Date()}
                    />
                </View>
                <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.endDateLabel')}</Text>
                    <DateTimePicker
                        value={parseDate(form.end_date)}
                        mode="date"
                        display="compact"
                        onValueChange={(_e, date) => {
                            patch('end_date', date.toISOString().split('T')[0]);
                        }}
                        maximumDate={new Date()}
                    />
                </View>
                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.platformLabel')}</Text>
                    <SelectMenu
                        label={form.platform ?? tr('editGame.platformDefault')}
                        options={PLATFORMS.map(p => ({label: activeSource === "local" && p === "Other" ? tr("screens.localMode.otherPlatform") : p, value: p}))}
                        selected={form.platform}
                        onSelect={value => patch('platform', value)}
                    />
                </View>
                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.progressLabel')}</Text>
                    <SelectMenu
                        label={form.progress_mode ? PROGRESS_MODES.find(m => m.key === form.progress_mode)?.label : tr('editGame.progressDefault')}
                        options={PROGRESS_MODES.map(m => ({label: m.label, value: m.key}))}
                        selected={form.progress_mode}
                        onSelect={value => patch('progress_mode', value)}
                    />
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
                <View style={{flexDirection: 'column', gap: 6, paddingVertical: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.groupsSection')}</Text>
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
                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>{tr('editGame.statusLabel')}</Text>
                    <SelectMenu
                        label={form.status ? STATUS_CONFIG[form.status].label : tr('editGame.statusDefault')}
                        options={GAME_STATUSES.map(status => ({label: STATUS_CONFIG[status].label, value: status}))}
                        selected={form.status}
                        onSelect={value => patch('status', value)}
                    />
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
                        handleSave();
                        if (Platform.OS === 'ios') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                    }}
                    accessibilityLabel={tr('editGame.saveA11y')}
                    style={[styles.saveButton, {backgroundColor: t.accent}]}
                >
                    <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>{tr('editGame.saveLabel')}</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1},
    scroll: {flex: 1},
    section: {
        marginHorizontal: 16,
        marginTop: 10,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    label: {
        fontSize: 18,
        fontWeight: '700',
    },
    input: {
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
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
    statusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statusPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    statusPillText: {
        fontSize: 13,
        fontWeight: '700',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 10,
        padding: 12,
    },
    saveButton: {
        margin: 16,
        padding: 16,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 32,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    divider: {
        //height: StyleSheet.hairlineWidth,
        marginHorizontal: 16,
        marginTop: 20,
    },
});
