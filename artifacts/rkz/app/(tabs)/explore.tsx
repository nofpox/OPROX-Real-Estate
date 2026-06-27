// Hidden legacy route — redirects to home
import { Redirect } from "expo-router";
export default function ExploreLegacy() {
  return <Redirect href="/(tabs)" />;
}
