
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

### Quickstart

1. [install](#how-do-i-install-this) from either the [Releases Tab](https://github.com/Khitboksy/img2key/releases), or use the provided [`flake.nix`](#nix-flakes) if you're on NixOS with flakes enabled.
2. find an image you want to use as a password
3. `img2key <path/to/file.png> [options]`

By default, no data is written to disk. The generated password is always written
into `stdout` so you can pipe into something like `wl-copy`.

> [!TIP]
> If you have already age encryption set up, you can use the following
> commands to get that integrated before we continue.
> If you want to use `encrypt`, you will need to install `age`

Obtaining a key-pair
`img2key getkey <path> [name]`

Registering a public key
`img2key setkey [<path> | <age1...>]`

#### Standard Usage

`img2key <path/to/file.png> --salt "phrase" | wl-copy`
> this pipes your generated password into your clipboard

#### Integration(s)

`img2key <path/to/file.png> --salt "phrase" -bw github | wl-copy`
> this pushes the generated password to the "github" item in bitwarden,
>while also piping into clipboard.

> [!NOTE]
>
> This program has optional integration for the following programs:
>
> - [bitwarden-cli](https://bitwarden.com/help/cli/)
> Invoked with `--bitwarden <item> / -bw`
> - [secret-service](https://github.com/swiesend/secret-service)
> Invoked with `--keyring <item> / -kr`
> - [age-encryption](https://github.com/filosottile/age)
> Invoked with `img2key <image> encrypt <path> [name]`
>
> All require their respective CLI tools to be installed.

### Flags and Arguments

|  Flag  | Description    | Example |
|--------------- | --------------- | --- |
| `--length / -l` | Length of generated password. | `--length 12` |
| `--salt / -s` | Add user specified strings to the image bit data | `--salt "phrase"` |
| `--bitwarden / -bw` | Pipe output to bitwarden-cli | `--bitwarden github` |
| `--keyring / -kr` | Pipe output to secret-service | `--keyring github` |
| `--version / -v` | Show version and exit | `--version` |

| Argument | Description | Position/Example |
| --- | --- | --- |
| `setkey [<file> ,or, "age1..."]` | Set the public key for img2key | `img2key setkey /path/to/public/key.txt` |
| `getkey <path> [name]` | Generate an age keypair | `img2key getkey ~/secrets img2key-helios` |
| `encrypt <path> [name]` | Pipe output into age before writing to disk | `img2key image.png encrypt ~/secrets github` |

## How Do I Install This?

### Nix Flakes

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

Run with: `img2key <image> [options]`

### Non-Nix Linux/MacOS

Navigate to [Releases/v1.*/](https://github.com/Khitboksy/img2key/releases)

#### Linux/MacOS  

download the archive for linux/mac, `img2key-Linux.tar.gz` or `img2key-macOS.tar.gz`.  
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

Run with: `img2key <image> [options]`

#### Windows  

download the archive for windows, `img2key-Windows.zip`.  
navigate to the downloaded file, extract it.  
Run with: `./img2key.exe <image> [options]` from the extracted file location.

## How do I contribute?

This project is written in `typescript`, using `bun` as the runtime for my machine.
This program is fully portable under *just* `node`. `bun` is NOT required.

> [!TIP]
>
> Nix users can use the provided [`flake.nix`](#nix-flakes) to skip straight to [here](#actually-doing-dev-work)!

Pick your runtime:

| Runtime | Install |
|---------|---------|
| **Bun** | [bun.sh/docs/installation](https://bun.sh/docs/installation) |
| **Node** | [nodejs.org](https://nodejs.org/) or your package manager |

## How do I actually do dev work?

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
