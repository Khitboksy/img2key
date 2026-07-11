{
  description = "img2key - derive deterministic passwords from images";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs, ... }: let
    systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ];

    forAllSystems = f:
      builtins.foldl' (acc: system:
        let ret = f system; in {
          packages = acc.packages // { ${system} = ret.packages; };
          devShells = acc.devShells // { ${system} = ret.devShells; };
        }
      ) { packages = {}; devShells = {}; } systems;
  in
  forAllSystems (
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
              --outfile=img2key \
              ./index.ts
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
