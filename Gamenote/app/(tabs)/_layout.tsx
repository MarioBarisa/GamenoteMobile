import {Icon, Label, NativeTabs} from "expo-router/unstable-native-tabs";

// noinspection JSUnusedGlobalSymbols
export default function TabsLayout() {

    // Apple SF icons online list https://hotpot.ai/free-icons


    return (
        <NativeTabs>
            <NativeTabs.Trigger name="home">
                <Label>Početna</Label>
                <Icon sf="house.fill" drawable="ic_menu_view"/>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="favorites">
                <Label>Moje igre</Label>
                <Icon sf="bookmark.fill" drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="search" role="search">
                <Label>Pretraži</Label>
                <Icon sf="magnifyingglass" drawable="ic_menu_search"/>
            </NativeTabs.Trigger>


            <NativeTabs.Trigger name="groups">
                <Label>Grupe</Label>
                <Icon sf="rectangle.stack" drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="profile">
                <Label>Profil</Label>
                <Icon sf="person.fill" drawable="ic_menu_agenda"/>
            </NativeTabs.Trigger>

        </NativeTabs>

    );
}
