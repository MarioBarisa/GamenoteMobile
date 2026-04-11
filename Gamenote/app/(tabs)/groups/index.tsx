// noinspection JSUnusedGlobalSymbols
import { ScrollView } from "react-native";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";


// noinspection JSUnusedGlobalSymbols
export default function() {

  const { theme } = useTheme();
  const t = colors[theme];


  return (

      <ScrollView style={{backgroundColor: t.background}}>

      </ScrollView>
  );
}


