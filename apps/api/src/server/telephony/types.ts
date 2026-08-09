export type StartCallInput = {
  callId: string;
  to: string;
  answerUrl: string;
  statusUrl: string;
  recordingStatusUrl: string;
  recordingAllowed: boolean;
};

export type StartCallResult = {
  provider: 'mock' | 'twilio' | 'vonage';
  providerCallId: string;
};

export interface TelephonyProvider {
  startCall(input: StartCallInput): Promise<StartCallResult>;
}
