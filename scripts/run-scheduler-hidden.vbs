Option Explicit

Dim shell, command, exitCode
Set shell = CreateObject("WScript.Shell")

command = """D:\Projects\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe"" ""D:\Projects\laragon\www\aquafuros\artisan"" schedule:run"
exitCode = shell.Run(command, 0, True)

WScript.Quit exitCode
