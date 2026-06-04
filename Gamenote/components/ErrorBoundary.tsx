import {Component, PropsWithChildren, ReactNode} from "react";
import {Text, View} from "react-native";

type State = { hasError: boolean };

export default class ErrorBoundary extends Component<PropsWithChildren, State> {
    state: State = {hasError: false};

    static getDerivedStateFromError(): State {
        return {hasError: true};
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <View style={{flex: 1, justifyContent: "center", alignItems: "center", padding: 24}}>
                    <Text style={{fontSize: 18, fontWeight: "bold", marginBottom: 8}}>Nešto je pošlo po krivu</Text>
                    <Text style={{fontSize: 14, textAlign: "center", color: "gray"}}>
                        Pokušaj ponovno otvoriti aplikaciju.
                    </Text>
                </View>
            );
        }
        return this.props.children;
    }
}
