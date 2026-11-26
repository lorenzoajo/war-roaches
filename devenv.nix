{ pkgs, ... }:
{
  packages = [ pkgs.git ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.enable = true;
  };

  enterShell = ''
    echo "War Roaches dev shell — npm run dev | npm test | nix build"
  '';
}
