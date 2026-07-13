# img2key

Have you ever wanted your memes to ALSO be your password? No? shit...
Well, anyway, I made a thingy that does that!

## How Do I Use This?

1. install from either the [Releases Tab](https://github.com/Khitboksy/img2key/releases), or use the provided `flake.nix` if you're on NixOS with flakes enabled.
2. find an image you want to use as a password
3. `img2key <path/to/file.png> --name <fileName> [--length <len>] [--out <dir>]`

Note: This program has OPTIONAL [bitwarden-cli](https://bitwarden.com/help/cli/) integration that requires
bitwarden to be installed.

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

#### Non-Nix Linux/MacOS

Navigate to [Releases/v1.*/](https://github.com/Khitboksy/img2key/releases)
-- Linux
download the binary for linux/mac, `img2key-Linux/MacOS`. Invoke the binary as the command.

-- Windows
download the .exe, run the exe, img2key is now a scary terminal command!

### Flags and Arguments

|  Flag  | Description    | Example |
|--------------- | --------------- | --- |
| `--name / -n` | Name of the generated file.  | `--name vaultwarden` > `vaultwarden.txt` |
| `--length / -l` | Length of generated password. | `--length 12` |
| `--out / -o` | Output directory. |  `--out /tmp/keys` > `/tmp/keys/vaultwarden.txt`|
| `--stdout` | Push to stdout for piping |  |
| `--salt / -s` | Add user specified strings to the image bit data | `--salt "phrase"` produces a different password than when `--salt` is omited entirely |
| `--bitwarden / -bw` | Pipe output to bitwarden-cli | `--bitwarden github` changes `login.password` to be the generated one |
| `-bw <item> cleanup` | Delete `<name>.txt` when done updating | `img2key <image> -n github -bw github cleanup` removes `github.txt` from disk when done |

## I want to contribute

It has some development dependencies.

> Nix users can use the provided `flake.nix` to skip all of this!

### Bun

#### Linux

```bash
curl -fsSL https://bun.sh/install | bash
```

#### Windows

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

#### MacOS

```bash
brew install bun
```

### Node

#### Arch/Cachy

```bash
sudo pacman -S nodejs
```

> Or you can use whatever repo you want, im not ur mom.

#### Ubuntu/Debian

```bash
sudo apt install nodejs
```

> Why do I feel you already have these installed...

#### Fedora/RHEL

```bash
sudo dnf install nodejs
```

> Deja-Vu...

#### MacOS

```bash
brew install nodejs
```

## Actually doing dev work

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/main.ts
```
