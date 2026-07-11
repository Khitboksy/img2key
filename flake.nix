{
  description = "img2key - derive deterministic passwords from images";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };

        nodejs = pkgs.nodejs_22;
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            nodejs
            git
          ];

          shellHook = ''
            echo "img2key dev shell"
            echo "  bun:  $(bun --version)"
            echo "  node: $(node --version)"
          '';
        };

        packages.default = pkgs.stdenvNoCC.mkDerivation {
          name = "img2key";
          src = self;

          nativeBuildInputs = [ pkgs.bun ];

          buildPhase = ''
            bun build --compile \
              --target=bun-linux-x64-modern \
              --outfile=img2key \
              ./src/index.ts
          '';

          installPhase = ''
            install -Dm755 img2key $out/bin/img2key
          '';

          meta = {
            description = "Derive deterministic passwords from images";
            mainProgram = "img2key";
          };
        };
      }
    );
}
