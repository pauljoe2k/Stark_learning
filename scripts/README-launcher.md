# Windows desktop launcher

Run `scripts\install-shortcut.ps1` once from PowerShell to add **Pinpoint** to your Desktop. Double-click the shortcut to start any missing services and open the dashboard in an Edge/Chrome app window. Close that app window to stop only the services started by the launcher. Output is written to the root `logs\` directory.

To uninstall, delete `Pinpoint.lnk` from your Desktop. If the launcher reports a busy port, stop the process using port 4000 (API) or 5173 (Vite), or change the corresponding port in `scripts\pinpoint-launcher.ps1`. If a healthy Pinpoint server or frontend already responds on those ports, it is reused and is not stopped by the launcher.
