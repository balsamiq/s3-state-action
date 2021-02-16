# balsamiq/s3-state-action
Manage shared state for GitHub Actions via S3

## Inputs

### `who-to-greet`

**Required** The name of the person to greet. Default `"World"`.

## Outputs

### `time`

The time we greeted you.

## Example usage

    uses: balsamiq/s3-state-action@v1.0
    with:
      who-to-greet: 'Mona the Octocat'
