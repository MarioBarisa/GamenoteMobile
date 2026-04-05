import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Početna</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Moje igre</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
        //  src={require('@/assets/images/tabIcons/Bookmark.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

        <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Statistika</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
         // src={require('@/assets/images/tabIcons/Statistika.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

        <NativeTabs.Trigger name="groups">
        <NativeTabs.Trigger.Label>Grupe</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
        //  src={require('@/assets/images/tabIcons/Groups.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
         // src={require('@/assets/images/tabIcons/account.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
