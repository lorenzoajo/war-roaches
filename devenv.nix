{ pkgs, ... }:
{
  packages = [ pkgs.git ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm = {
      enable = true;
      install.enable = true;
    };
  };

  # `devenv up`: Vite dev server on the LAN so phones can join.
  processes.vite.exec = "npm run dev -- --port 5173 --strictPort";

  scripts.preview.exec = "npm run build && npm run preview -- --port 4173";

  enterShell = ''
    echo "War Roaches — devenv up (dev server :5173) | npm test | preview | nix build"
  '';

  enterTest = ''
    npm run typecheck
    npm test
  '';
}
