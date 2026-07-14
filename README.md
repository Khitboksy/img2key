
# img2key

Have you ever wanted your memes to ALSO be your password? No? shit...
Well, anyway, I made a thingy that does that!

> [!WARNING]
>
> If you ever see a version number ending with `x`, like `v1.3.0x`, that means a breaking change
> was introduced to the logic that **requires** that you regenerate the passwords.
>
> The passwords will still work, however the recovery pipeline for those old passwords is dead.
>
> im sorry! >.<

## How Do I Use This?

1. install from either the [Releases Tab](https://github.com/Khitboksy/img2key/releases), or use the provided [`flake.nix`](#nix-flakes) if you're on NixOS with flakes enabled.
2. find an image you want to use as a password
3. `img2key <path/to/file.png> -n <name> [options]`

> [!NOTE]
>
> This program has optional integration for the following secret managers:
>
> - [bitwarden-cli](https://bitwarden.com/help/cli/)
> Invoked with `--bitwarden <item> [cleanup] / -bw`
> - [secret-service](https://github.com/swiesend/secret-service)
> Invoked with `--keyring <item> [cleanup] / -kr`
>
> Both require their respective CLI tools to be installed.

### How Do I Install This?

#### Nix Flakes

Adding this to your flake.nix

```nix
# flake.nix
inputs = {
  img2key = {
    url = "github:khitboksy/img2key";
    inputs.nixpkgs.follows = "nixpkgs";
  };
};
```

will expose

```nix
inputs.img2key.packages.<system>.default
```

that you can invoke anywhere.

Run with: `img2key <image> -n <name> [options]`

#### Non-Nix Linux/MacOS

Navigate to [Releases/v1.*/](https://github.com/Khitboksy/img2key/releases)  
-- Linux/MacOS  
download the archive for linux/mac, `img2key-Linux` or `img2key-macOS`.  
navigate to the downloaded archive and run

```bash
# Linux
tar xzf img2key-Linux.tar.gz          # Extract the `img2key` binary
sudo install img2key /usr/local/bin/  # Put `img2key` in $PATH and ensure executability
```

```bash
# MacOS
tar xzf img2key-macOS.tar.gz
sudo install img2key /usr/local/bin/
```

Run with: `img2key <image> -n <name> [options]`

-- Windows  
download the archive for windows, `img2key-Windows.zip`.  
navigate to the downloaded file, extract it.  
Run with: `./img2key.exe <image> -n <name> [options]` from the extracted file location.

### Flags and Arguments

|  Flag  | Description    | Example |
|--------------- | --------------- | --- |
| `--name / -n` | Name of the generated file.  | `--name vaultwarden` > `vaultwarden.txt` |
| `--length / -l` | Length of generated password. | `--length 12` |
| `--out / -o` | Output directory. |  `--out /tmp/keys` > `/tmp/keys/vaultwarden.txt`|
| `--stdout` | Push to stdout for piping | `--stdout` |
| `--salt / -s` | Add user specified strings to the image bit data | `--salt "phrase"` |
| `--bitwarden / -bw` | Pipe output to bitwarden-cli | `--bitwarden github` |
| `--keyring / -kr` | Pipe output to secret-service | `--keyring github` |
| `--version / -v` | Show version and exit | `--version` |
| `cleanup` | Delete `<name>.txt` when done updating | `-bw github cleanup` |

## I want to contribute

This project is written in `typescript`, using `bun` as the runtime for my machine. This program is fully portable under *just* `node`. `bun` is NOT required.

> [!TIP]
>
> Nix users can use the provided [`flake.nix`](#nix-flakes) to skip straight to [here](#actually-doing-dev-work)!

Pick your runtime:

| Runtime | Install |
|---------|---------|
| **Bun** | [bun.sh/docs/installation](https://bun.sh/docs/installation) |
| **Node** | [nodejs.org](https://nodejs.org/) or your package manager |

## Actually doing dev work

Installing node deps, and running the dev script:

```bash
# Bun
bun install
bun run img2key

# Node
npm install
npm run img2key
```

Bumping the version number so the workflow triggers:

```bash
# Bun
bun run bump v1.x.x

# Node
npm run bump v1.x.x

git push origin main && git push origin --tags
```
