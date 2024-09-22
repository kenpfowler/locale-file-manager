export enum Action {
  Managing = "managing",
  Generating = "generating",
  Initializing = "initializing",
}

export class Logger {
  public static readonly program_name = "locale-file-manager";
  public static readonly max_action_length = Action.Initializing.length;

  public static message(action: string, message: string) {
    console.log(
      `[${this.program_name}]: ${action.padEnd(
        this.max_action_length
      )} - ${message}`
    );
  }
}
