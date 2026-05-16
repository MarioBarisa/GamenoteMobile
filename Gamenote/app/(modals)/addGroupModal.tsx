import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {useRouter} from "expo-router";
import {Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import {Group} from "@/common/groups";
import {SymbolView} from "expo-symbols";
import * as Haptics from "expo-haptics";
import {useState} from "react";
import {useGroups} from "@/context/GroupsContext";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";


export default function AddGroupModal() {
    const {theme} = useTheme()
    const t = colors[theme]
    const router = useRouter();
    const {addGroup, addGameToGroup} = useGroups();

    const typeGroups = ["Collection", "Trilogy", "Franchise"];

    const [form, setForm] = useState<Partial<Group>>({
        name: '',
        type: typeGroups[0],
        rating: undefined,
        created_at: new Date().toISOString(),
        user_notes: '',
    });

    const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);


    const patch = (key: keyof Group, value: any) => setForm(prev => ({...prev, [key]: value}));

    const handleSave = () => {
        if (!form.name?.trim()) {
            Alert.alert('Nedostaje naziv', 'Upiši ime grupe.');
            return;
        }

        const newGroup = addGroup({
            user_id: 'user1',
            name: form.name.trim(),
            type: form.type ?? null,
            rating: form.rating ?? null,
            user_notes: form.user_notes ?? null,
        });

        selectedGameIds.forEach((gameId) => addGameToGroup(gameId, newGroup.id));

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        Alert.alert('', `Grupa "${newGroup.name}" je dodana.`, [ //'' je empty  kako bi alert bio u jednom redu.
            {text: 'OK', onPress: () => router.back()}
        ]);
    };

    const isGameSelected = (gameId: string) => selectedGameIds.includes(gameId);
    const [showAll, setShowAll] = useState(false);
    const visibleGames = showAll ? PLACEHOLDER_GAMES : PLACEHOLDER_GAMES.slice(0, 5);

    const toggleGame = (gameId: string) => {
        setSelectedGameIds(prev =>
            prev.includes(gameId)
                ? prev.filter(id => id !== gameId)
                : [...prev, gameId]
        );
    };

    return (
        <ScrollView
            contentContainerStyle={{gap: 10, padding: 8}}
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
                        <TextInput
                            style={[styles.titleInput, {
                                color: t.text,
                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'
                            }]}
                            value={form.name ?? ''}
                            onChangeText={v => patch('name', v)}
                            placeholder="Naslov grupe?..."
                            placeholderTextColor={t.secondaryText}
                            textAlignVertical="top"
                        />
                    </View>
                    <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8}}>
                        <Text style={[styles.label, {color: t.text}]}>Vrsta grupe: </Text>
                        <Pressable
                            onPress={() => Alert.alert(
                                'Odaberi vrstu grupe',
                                undefined,
                                [
                                    ...typeGroups.map(type => ({
                                        text: type,
                                        onPress: () => patch('type', type),
                                    })),
                                    {text: 'Odustani', style: 'cancel'},
                                ]
                            )}
                            style={{flexDirection: 'row', alignItems: 'center', gap: 6}}
                        >
                            <Text style={{color: t.text, fontSize: 15, fontWeight: '500'}}>
                                {form.type}
                            </Text>
                            <SymbolView
                                name="chevron.up.chevron.down"
                                style={{width: 14, height: 14}}
                                tintColor={t.accent}
                            />
                        </Pressable>
                    </View>
                    <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8}}>
                        <Text style={[styles.label, {color: t.text, paddingTop: 6}]}>Ocjena:</Text>
                        {[1, 2, 3, 4, 5].map(star => (
                            <Pressable
                                key={star}
                                onPress={() => patch('rating', star === form.rating ? undefined : star)}
                                hitSlop={8}
                            >
                                <SymbolView
                                    name={star <= (form.rating ?? 0) ? 'star.fill' : 'star'}
                                    style={{width: 32, height: 32}}
                                    tintColor={star <= (form.rating ?? 0) ? '#FF9F0A' : t.secondaryText}
                                />
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={{flexDirection: 'column', gap: 8, paddingVertical: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>Dodaj igre:</Text>
                    {visibleGames.map((game) => {
                        const isSelected = isGameSelected(game.game_id);

                        return (
                            <Pressable
                                key={game.game_id}
                                onPress={() => {
                                    toggleGame(game.game_id);
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
                                    backgroundColor: isSelected
                                        ? (theme === 'dark' ? '#1C3A2F' : '#D1FAE5')
                                        : (theme === 'dark' ? '#2C2C2E' : '#E5E5EA'),
                                    marginBottom: 4,
                                }}
                            >
                                <Text style={{fontSize: 14, fontWeight: '700', color: t.text}}>{game.title} </Text>
                                {isSelected && (
                                    <SymbolView
                                        name="checkmark"
                                        style={{width: 20, height: 20}}
                                        tintColor={t.accent}
                                    />
                                )}
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
                    <TextInput
                        style={[styles.notesInput, {
                            color: t.text,
                            backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'
                        }]}
                        value={form.user_notes ?? ''}
                        onChangeText={v => patch('user_notes', v)}
                        multiline={true}
                        numberOfLines={10}
                        placeholder="Dodaj bilješke..."
                        placeholderTextColor={t.secondaryText}
                        textAlignVertical="top"
                    />
                </View>

                <Pressable
                    onPress={handleSave}
                    style={[styles.saveButton, {backgroundColor: t.accent}]}
                >
                    <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>Dodaj grupu</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
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