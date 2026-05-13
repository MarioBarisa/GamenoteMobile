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
import {colors} from "@/constants/theme";
import {Game} from "@/common/Game";
import {useState} from "react";
import {SymbolView} from "expo-symbols";
import DateTimePicker, {DateTimePickerEvent} from "@react-native-community/datetimepicker";
import {STATUS_CONFIG, GAME_STATUSES} from "@/common/StatusCommons";
import * as Haptics from 'expo-haptics';
import {PROGRESS_MODES} from "@/common/ProgressSources";


export default function ModalEdit() {
    const {game: gameParam} = useLocalSearchParams<{ game: string }>();
    const router = useRouter();
    const {theme} = useTheme();
    const t = colors[theme];

    const handleSave = () => {
        if (form.progress_value !== undefined && form.progress_total !== undefined && form.progress_value > form.progress_total) {
            Alert.alert('Greška', 'Broj osvojenih postignuća ne može biti veći od ukupnog broja.');
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const updated: Game = {...original, ...form};
        //TU DOLAZI SUPABASE IMPLEMENTACIJA KASINIJE!!!!!!!!
        Alert.alert('Spremljeno', `${original.title} ažuriran.`, [
            {text: 'OK', onPress: () => router.back()}
        ]);
    }

    const parseDate = (iso?: string) => iso ? new Date(iso) : new Date();

    const original: Game = (() => {
        try {
            return gameParam ? JSON.parse(gameParam) : {}
        } catch {
            return {}
        }
    })();

    const [form, setForm] = useState<Partial<Game>>({
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
            <View style={styles.section}>
                <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>Ocjena:</Text>
                    {[1, 2, 3, 4, 5].map(star => (
                        <Pressable key={star}
                                   onPress={() => patch('rating', star === form.rating ? undefined : star)} //OCJENA IGRE
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
                    <Text style={[styles.label, {color: t.text}]}>Početak igranja:</Text>
                    <DateTimePicker
                        value={parseDate(form.start_date)}  //DATUMI POČETKA I KRAJA IGRNAJA
                        mode="date"
                        display="compact"
                        onChange={(e: DateTimePickerEvent, date?: Date) => {
                            if (date) patch('start_date', date.toISOString().split('T')[0]);
                        }}
                        maximumDate={new Date()}
                    />
                </View>
                <View style={{flexDirection: 'row', gap: 8, paddingVertical: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>Kraj igranja:</Text>
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
                    <Text style={[styles.label, {color: t.text}]}>Platforma: </Text>
                    <Pressable
                        onPress={() => Alert.alert(
                            'Odaberi platformu',  // ODABIR PLATFORME NA KOJOJ JE IGRA IGRANA

                            undefined,
                            [
                                ...PLATFORMS.map(p => ({
                                    text: p,
                                    onPress: () => patch('platform', p),
                                })),
                                {text: 'Odustani', style: 'cancel'},
                            ]
                        )}
                        style={{flexDirection: 'row', alignItems: 'center', gap: 6}}
                    >
                        <Text style={{color: t.text, fontSize: 15, fontWeight: '500'}}>
                            {form.platform ?? 'Odaberi platformu'}
                        </Text>
                        <SymbolView name="chevron.up.chevron.down" style={{width: 14, height: 14}}
                                    tintColor={t.accent}/>
                    </Pressable>
                </View>
                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>Vrsta Progresa: </Text>
                    <Pressable
                        onPress={() =>
                            Alert.alert('Odaberi vrstu progressa', undefined, [
                                ...PROGRESS_MODES.map(m => ({
                                    text: m.label,
                                    onPress: () => patch('progress_mode', m.key),
                                })),
                                {text: 'Odustani', style: "cancel"},
                            ])} style={{flexDirection: "row", alignItems: "center", gap: 6}}>
                        <Text style={{color: t.text, fontSize: 16, fontWeight: '500'}}>
                            {form.progress_mode ? PROGRESS_MODES.find(m => m.key === form.progress_mode)?.label : 'Odaberi'}
                        </Text>
                        <SymbolView name="chevron.up.chevron.down" style={{width: 14, height: 14}}
                                    tintColor={t.accent}/>
                    </Pressable>
                </View>
                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>Postignuća: </Text>
                    <TextInput style={[styles.numInput, {
                        color: t.text,
                        backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'
                    }]}
                               value={form.progress_value?.toString() ?? ''}
                               onChangeText={v => patch('progress_value', v === '' ? undefined : parseInt(v))}
                               keyboardType="numeric"
                               placeholder="0"
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
                               placeholder="0"
                               placeholderTextColor={t.secondaryText}
                               maxLength={4}/>
                </View>
                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>Playtime: </Text>
                    <TextInput style={[styles.input, {
                        color: t.text,
                        backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'
                    }]} //PLAYTIME IGRE
                               value={form.play_time?.toString() ?? ''}
                               onChangeText={v => patch('play_time', v === '' ? undefined : parseInt(v))}
                               keyboardType="number-pad"
                               placeholder="Npr. 120"
                               placeholderTextColor={t.secondaryText}/>
                </View>
                <View style={[{backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA'}]}/>
                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                    <Text style={[styles.label, {color: t.text}]}>Status igranja: </Text>
                    <Pressable
                        onPress={() => Alert.alert(
                            'Odaberi status igranja',

                            undefined,
                            [
                                ...GAME_STATUSES.map(status => ({
                                    text: STATUS_CONFIG[status].label,
                                    onPress: () => patch('status', status),
                                })),
                                {text: 'Odustani', style: 'cancel'},
                            ]
                        )}
                        style={{flexDirection: 'row', alignItems: 'center', gap: 6}}
                    >
                        <Text style={{color: t.text, fontSize: 15, fontWeight: '500'}}>
                            {form.status ? STATUS_CONFIG[form.status].label : 'Odaberi status igranja'}
                        </Text>
                        <SymbolView name="chevron.up.chevron.down" style={{width: 14, height: 14}}
                                    tintColor={t.accent}/>
                    </Pressable>
                </View>
                <Text style={[styles.label, {color: t.text}]}>Tvoje bilješke:</Text>
                <TextInput style={[styles.notesInput, {
                    color: t.text,
                    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA' //BILJEŠKE USERA
                }]}
                           value={form.notes ?? ''}
                           onChangeText={v => patch('notes', v)}
                           multiline={true}
                           numberOfLines={10}
                           placeholder="Dodaj bilješke..."
                           placeholderTextColor={t.secondaryText}
                           textAlignVertical="top"/>
                <Pressable
                    onPress={() => {
                        handleSave();
                        if (Platform.OS === 'ios') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); //medium vibracija kada se igra uspješno spremi
                        }
                    }}
                    style={[styles.saveButton, {backgroundColor: t.accent}]}
                >
                    <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>Spremi</Text>
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
        width: 80,
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
