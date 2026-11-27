import {StyleSheet, type ModalProps} from "react-native";

export const screenContent = StyleSheet.create({
    form: {width: "100%", maxWidth: 640, alignSelf: "center"},
    detail: {width: "100%", maxWidth: 800, alignSelf: "center"},
});

export const modalOrientations: ModalProps["supportedOrientations"] = ["portrait", "portrait-upside-down", "landscape"];
