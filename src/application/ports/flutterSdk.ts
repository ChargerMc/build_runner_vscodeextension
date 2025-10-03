export interface FlutterSdkGateway {
  resolveFlutterSdk(): Promise<string | null>;
  promptForFlutterSdk(): Promise<string | null>;
}
