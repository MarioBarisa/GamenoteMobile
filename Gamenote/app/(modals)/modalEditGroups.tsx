import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {useLocalSearchParams, useRouter} from "expo-router";
import {Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import {Group} from "@/common/groups";
import {SymbolView} from "expo-symbols";
//import DateTimePicker, {DateTimePickerEvent} from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import {useState} from "react";
import {useGroups} from "@/context/GroupsContext";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
//import {GAME_STATUSES, STATUS_CONFIG} from "@/common/StatusCommons";


export default function ModalEditGroups() {
    const {theme} = useTheme()
    const t = colors[theme]
    const router = useRouter();

    const params = useLocalSearchParams<{ group?: string }>();
    const groupParam = params.group;


    let group: Group | null = null;
    try {
        group = groupParam ? (JSON.parse(groupParam) as Group) : null;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        group = null;
    }

    const original: Group = group ?? ({} as Group);

    const [form, setForm] = useState<Partial<Group>>({
        name: original.name,
        type: original.type,
        rating: original.rating,
        created_at: original.created_at,
        user_notes: original.user_notes,
    });

    const {addGameToGroup, removeGameFromGroup, getGamesInGroup} = useGroups();
    const gamesInGroup: string[] = group ? getGamesInGroup(group.id) : [];

    const [showAll, setShowAll] = useState(false);
    const visibleGames = showAll ? PLACEHOLDER_GAMES : PLACEHOLDER_GAMES.slice(0, 5);

    const handleSave = () => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const updated = {...original, ...form}; // tu doalzi supabase
        Alert.alert('Spremljena', `"${updated.name}" grupa.`, [
            {text: 'OK', onPress: () => router.back()}
        ]);


    }

    const typeGroups = ["Collection", "Trilogy", "Franchise"];

    const patch = (key: keyof Group, value: any) => setForm(prev => ({...prev, [key]: value}));

    if (!group) {
        return <Text style={{color: t.text, padding: 16}}>Grupa nije pronađena</Text>;
    } else {
        return (
            <ScrollView contentContainerStyle={{gap: 10, padding: 8}}
                        style={{backgroundColor: t.backgroundModal}}
                        contentInsetAdjustmentBehavior="automatic"
                        automaticallyAdjustContentInsets={true}
                        keyboardShouldPersistTaps="handled"
                        automaticallyAdjustKeyboardInsets={true}
            >
                <View style={styles.section}>
                    <View style={{flexDirection: 'column', gap: 8, paddingVertical: 8}}>
                        <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8}}>
                            <Text style={[styles.label, {color: t.text, paddingTop: 8}]}>Ime grupe: </Text>
                            <TextInput style={[styles.titleInput, {
                                color: t.text,
                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA' //BILJEŠKE USERA
                            }]}
                                       value={form.name ?? ''}
                                       onChangeText={v => patch('name', v)}
                                //multiline={true}
                                //numberOfLines={}
                                       placeholder="Naslov grupe?..."
                                       placeholderTextColor={t.secondaryText}
                                       textAlignVertical="top"/>
                        </View>
                        <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8}}>
                            <Text style={[styles.label, {color: t.text}]}>Vrsta grupe: </Text>
                            <Pressable
                                onPress={() => Alert.alert(
                                    'Odaberi vrstu grupe',

                                    undefined,
                                    [
                                        ...typeGroups.map(status => ({
                                            text: status,
                                            onPress: () => patch('type', status),
                                        })),
                                        {text: 'Odustani', style: 'cancel'},
                                    ]
                                )}
                                style={{flexDirection: 'row', alignItems: 'center', gap: 6}}
                            >
                                <Text style={{color: t.text, fontSize: 15, fontWeight: '500'}}>
                                    {form.type}
                                </Text>
                                <SymbolView name="chevron.up.chevron.down" style={{width: 14, height: 14}}
                                            tintColor={t.accent}/>
                            </Pressable>
                        </View>
                        <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8}}>
                            <Text style={[styles.label, {color: t.text, paddingTop: 6}]}>Ocjena:</Text>
                            {[1, 2, 3, 4, 5].map(star => (
                                <Pressable key={star}
                                           onPress={() => patch('rating', star === form.rating ? undefined : star)} //OCJENA GRUPE
                                           hitSlop={8}>
                                    <SymbolView
                                        name={star <= (form.rating ?? 0) ? 'star.fill' : 'star'}
                                        style={{width: 32, height: 32}}
                                        tintColor={star <= (form.rating ?? 0) ? '#FF9F0A' : t.secondaryText}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    <View style={{flexDirection: "column", gap: 8, paddingVertical: 8}}>
                        <Text style={[styles.label, {color: t.text}]}>Igre u grupi:</Text>
                        {visibleGames.map((game) => {
                            const isInGroup = gamesInGroup.includes(game.game_id);
                            return (
                                <Pressable
                                    key={game.game_id}
                                    onPress={() => {
                                        if (isInGroup) {
                                            removeGameFromGroup(game.game_id, group.id);
                                        } else {
                                            addGameToGroup(game.game_id, group.id);
                                        }
                                        if (Platform.OS === 'ios') {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingVertical: 10,
                                        paddingHorizontal: 12,
                                        borderRadius: 10,
                                        backgroundColor: isInGroup
                                            ? (theme === 'dark' ? '#1C3A2F' : '#D1FAE5')
                                            : (theme === 'dark' ? '#2C2C2E' : '#E5E5EA'),
                                        marginBottom: 4,
                                    }}
                                >
                                    <Text
                                        style={[{fontSize: 14, fontWeight: "bold", color: t.text}]}>{game.title}</Text>
                                    {isInGroup && <SymbolView name="checkmark" style={{width: 20, height: 20}}
                                                              tintColor={t.accent}/>}
                                </Pressable>
                            );
                        })}
                        {PLACEHOLDER_GAMES.length > 5 && (
                            <Pressable
                                onPress={() => setShowAll(prev => !prev)}
                                style={{paddingVertical: 10, alignItems: 'center'}}
                            >
                                <Text style={{color: t.accent, fontSize: 14, fontWeight: '600'}}>
                                    {showAll ? 'Prikaži manje' : `Prikaži još ${PLACEHOLDER_GAMES.length - 5} igara`}
                                </Text>
                            </Pressable>
                        )}


                    </View>
                    <View style={{flexDirection: 'column', gap: 8, paddingVertical: 8}}>
                        <Text style={[styles.label, {color: t.text}]}>Tvoje bilješke:</Text>
                        <TextInput style={[styles.notesInput, {
                            color: t.text,
                            backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'
                        }]}
                                   value={form.user_notes ?? ''}
                                   onChangeText={v => patch('user_notes', v)}
                                   multiline={true}
                                   numberOfLines={10}
                                   placeholder="Dodaj bilješke..."
                                   placeholderTextColor={t.secondaryText}
                                   textAlignVertical="top"/>
                    </View>

                    <Pressable
                        onPress={() => { // SAVE GUMB
                            handleSave();
                            if (Platform.OS === 'ios') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); //medium vibracija kada se igra uspješno spremi
                            }
                        }}
                        style={[styles.saveButton, {backgroundColor: t.accent}]}
                    >
                        <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>Spremi izmjene</Text>
                    </Pressable>
                </View>
            </ScrollView>
        )
    }
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
        width: 80,
        textAlign: 'center',
    },
    notesInput: {
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        minHeight: 100,
    },
    titleInput: {
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        //  minHeight: 100,
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
});
