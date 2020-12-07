# Create-Release

Github Action for handling auto release creation

## Example

```yaml
- uses: jardenliu/create-release@master
  with:
    token: ${{github.token}}
    name: My lovely release
    code: latest
    prerelease: true
    recreate: true
    assets: >
      source.txt:target.txt:text/plain
      another:one:application/json
```
