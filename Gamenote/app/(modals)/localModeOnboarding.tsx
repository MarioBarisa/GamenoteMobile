import {useRouter} from "expo-router";
import {useTranslation} from "react-i18next";
import {AccountModal, ModalButton} from "@/components/AccountModal";
import IgdbCredentialsForm from "@/components/IgdbCredentialsForm";

export default function LocalModeOnboarding() {
    const router = useRouter();
    const {t} = useTranslation();
    return <AccountModal>
        <IgdbCredentialsForm onSaved={() => router.back()}/>
        <ModalButton secondary label={t("onboarding.localMode.later")} onPress={() => router.back()}/>
    </AccountModal>;
}
