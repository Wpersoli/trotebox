import type { StartCallInput, StartCallResult, TelephonyProvider } from './types';

export class MockTelephonyProvider implements TelephonyProvider {
  async startCall(input: StartCallInput): Promise<StartCallResult> {
    return { provider: 'mock', providerCallId: `mock_${input.callId}` };
  }
}
