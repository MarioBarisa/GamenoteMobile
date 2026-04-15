import {ScrollView, View, Text, StyleSheet, Switch} from "react-native";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";

export default function SettingsScreen() {
    const {theme, preference, setPreference} = useTheme();
    const t = colors[theme];

    const isDarkForced = preference === "dark";
    const isSystem = preference === "system";

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{backgroundColor: t.background}}
            contentContainerStyle={styles.container}
        >
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor:
                            theme === "dark"
                                ? "rgba(44,44,46,0.8)"
                                : "rgba(255,255,255,0.9)",
                    },
                ]}
            >
                <Text style={[styles.sectionTitle, {color: t.secondaryText}]}>
                    Izgled
                </Text>

                <View style={styles.row}>
                    <View>
                        <Text style={[styles.title, {color: t.text}]}>Dark Mode</Text>
                        <Text style={[styles.subtitle, {color: t.secondaryText}]}>
                            Koristi Dark Mode.
                        </Text>
                    </View>
                    <Switch
                        value={isDarkForced}
                        onValueChange={(value) =>
                            setPreference(value ? "dark" : "light")
                        }
                        trackColor={{
                            false: "rgba(120,120,128,0.32)",
                            true: "#34C759",
                        }}
                    />
                </View>

                <View style={styles.row}>
                    <View>
                        <Text style={[styles.title, {color: t.text}]}>Korist iOS default</Text>
                        <Text style={[styles.subtitle, {color: t.secondaryText}]}>
                            Gamenote koristi iOS default.
                        </Text>
                    </View>
                    <Switch
                        value={isSystem}
                        onValueChange={(value) =>
                            setPreference(value ? "system" : theme)
                        }
                        trackColor={{
                            false: "rgba(120,120,128,0.32)",
                            true: "#0a58ff",
                        }}
                       //KAKO STAVVTITI DA GUM IMA DRUGACIJU BOJU!!! thumbColor={theme === "dark" ? "#000" : "#FFF"}
                    />
                </View>
            </View>

            <View
                style={[
                    styles.card,
                    {
                        marginTop: 24,
                        backgroundColor:
                            theme === "dark"
                                ? "rgba(44,44,46,0.8)"
                                : "rgba(255,255,255,0.9)",
                    },
                ]}
            >
                <Text style={[styles.sectionTitle, {color: t.secondaryText}]}>
                    Ostalo
                </Text>

                <View style={styles.row}>
                    <View>
                    <Text style={[styles.title, {color: t.text}]}>Vibracije</Text>
                    <Text style={[styles.subtitle, { color: t.secondaryText}]}>Omoguci haptick feedback</Text>
                    </View>
                    <Switch
                        value={true}
                        onValueChange={() => {
                        }}
                        trackColor={{
                            false: "rgba(120,120,128,0.32)",
                            true: "#34C759",
                        }}
                    />
                </View>

                <View style={styles.row}>
                    <View>
                    <Text style={[styles.title, {color: t.text}]}>Zvukovi</Text>
                        <Text style={[styles.subtitle, {color: t.secondaryText}]}>Omoguci zvukove.</Text>
                    </View>
                    <Switch
                        value={true}
                        onValueChange={() => {
                        }}
                        trackColor={{
                            false: "rgba(120,120,128,0.32)",
                            true: "#34C759",
                        }}
                    />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    card: {
        borderRadius: 24,
        padding: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(120,120,128,0.2)",
        gap: 16,
    },
    sectionTitle: {
        fontSize: 13,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 4,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: {
        fontSize: 17,
        fontWeight: "500",
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
});
