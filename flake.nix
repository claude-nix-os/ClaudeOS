{
  description = "ClaudeOS v3 - Module-based self-expanding agent OS";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    # Module flake inputs get added here by module:add command
  };

  outputs = { self, nixpkgs, flake-utils, ... }@inputs:
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin" ] (system:
      let
        pkgs = import nixpkgs { inherit system; };
        nodejs = pkgs.nodejs_22;
      in {
        packages.default = pkgs.stdenv.mkDerivation {
          name = "claudeos";
          version = "3.0.0";
          src = ./.;

          nativeBuildInputs = [ nodejs pkgs.makeWrapper ];

          buildPhase = ''
            export HOME=$TMPDIR
            export npm_config_cache=$TMPDIR/.npm
            npm ci
            npm run build
          '';

          installPhase = ''
            mkdir -p $out/lib/claudeos
            cp -r . $out/lib/claudeos/

            mkdir -p $out/bin
            makeWrapper ${nodejs}/bin/node $out/bin/claudeos \
              --add-flags "$out/lib/claudeos/kernel/server.ts" \
              --set NODE_ENV production
          '';
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs
            nodePackages.npm
            git
            curl
            jq
            ripgrep
            fd
            tree
            openssh
            openssl
            python3
          ];

          shellHook = ''
            echo "ClaudeOS v3 Development Shell"
            echo "Node.js: $(node --version)"
            echo "npm: $(npm --version)"
            echo ""
            echo "Commands:"
            echo "  npm run dev        - Start development server"
            echo "  npm run build      - Build for production"
            echo "  npm test           - Run tests"
            echo "  npm run typecheck  - Type check"
            echo "  npm run module:add - Add a module"
            echo "  npm run module:list - List modules"
          '';
        };

        # NixOS module for system-level configuration
        nixosModules.default = { config, lib, pkgs, ... }: with lib; {
          options.services.claudeos = {
            enable = mkEnableOption "ClaudeOS v3 agent OS";

            port = mkOption {
              type = types.int;
              default = 3000;
              description = "Port for the ClaudeOS server";
            };

            dataDir = mkOption {
              type = types.str;
              default = "/var/lib/claudeos";
              description = "Directory for persistent data";
            };

            authToken = mkOption {
              type = types.nullOr types.str;
              default = null;
              description = "Auth token (auto-generated if null)";
            };

            extraEnv = mkOption {
              type = types.attrsOf types.str;
              default = {};
              description = "Additional environment variables";
            };
          };

          config = mkIf config.services.claudeos.enable {
            systemd.services.claudeos = {
              description = "ClaudeOS v3";
              after = [ "network.target" ];
              wantedBy = [ "multi-user.target" ];

              environment = {
                NODE_ENV = "production";
                PORT = toString config.services.claudeos.port;
                DATA_DIR = config.services.claudeos.dataDir;
              } // (if config.services.claudeos.authToken != null then {
                CLAUDE_OS_AUTH_TOKEN = config.services.claudeos.authToken;
              } else {}) // config.services.claudeos.extraEnv;

              serviceConfig = {
                Type = "simple";
                ExecStart = "${self.packages.${system}.default}/bin/claudeos";
                Restart = "always";
                RestartSec = 5;
                DynamicUser = true;
                StateDirectory = "claudeos";
              };
            };
          };
        };
      }
    );
}
