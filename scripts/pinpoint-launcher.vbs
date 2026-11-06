Option Explicit
Dim shell, fso, scriptPath, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptPath = fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "pinpoint-launcher.ps1")
command = "powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File """ & scriptPath & """"
shell.Run command, 0, False
