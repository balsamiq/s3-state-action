import * as core from '@actions/core';
import S3 from 'aws-sdk/clients/s3';

async function main() {
    const AWS_KEY_ID = core.getInput('aws_key_id', { required: true });
    const SECRET_ACCESS_KEY = core.getInput('aws_secret_access_key', { required: true });
    const bucket_name = core.getInput('aws_state_bucket_name', { required: true });
    const directory = core.getInput('aws_state_directory', { required: true });
    const command = core.getInput('aws_state_command', { required: true });

    const state = new S3State(
        new S3({ accessKeyId: AWS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY }),
        bucket_name,
        `${directory}/github_actions_state.json`
    );

    if (command === 'increment_counter') {
        let counter_name = core.getInput('counter_name') || 'counter';
        let counter_value = await state.incrementCounter(counter_name);
        core.setOutput('counter_value', `${counter_value}`);
    } else {
        core.setFailed(`Invalid "aws_state_command" value: "${command}"`);
    }
}

type StateRecord = {
    counters?: { [counter_name: string]: number };
};

function isStateRecord(obj: unknown): obj is StateRecord {
    if (!(obj instanceof Object)) {
        return false;
    }
    const { counters } = obj as any;
    if (counters) {
        if (!(counters instanceof Object)) {
            return false;
        }
        for (let k of Object.keys(counters)) {
            if (typeof counters[k] !== 'number') {
                return false;
            }
        }
    }
    return true;
}

class S3State {
    constructor(private s3: S3, private bucket_name: string, private state_json_filepath: string) {}

    async incrementCounter(counter_name: string): Promise<number> {
        let state = await this.getState();
        let counter_value = 0;
        if (!state.counters) {
            state.counters = {};
        }
        if (state.counters[counter_name]) {
            counter_value = state.counters[counter_name];
        }
        state.counters[counter_name] = counter_value + 1;
        await this.setState(state);
        return counter_value;
    }

    private async getState(): Promise<StateRecord> {
        const object: unknown = await this.s3.getObject({ Bucket: this.bucket_name, Key: this.state_json_filepath });
        if (typeof object !== 'string') {
            core.info(`getState ${this.bucket_name}::${this.state_json_filepath}: no string found`);
            return {};
        }
        try {
            const stateJson: unknown = JSON.parse(object);
            if (isStateRecord(stateJson)) {
                return stateJson;
            } else {
                core.info(`getState ${this.bucket_name}::${this.state_json_filepath}: not a StateRecord type`);
                return {};
            }
        } catch {
            core.info(`getState ${this.bucket_name}::${this.state_json_filepath}: error parsing json`);
            return {};
        }
    }

    private async setState(state: StateRecord): Promise<void> {
        await this.s3.putObject({ Bucket: this.bucket_name, Key: this.state_json_filepath, Body: JSON.stringify(state) });
    }
}

main().catch(function (error) {
    core.setFailed(error.message);
});
