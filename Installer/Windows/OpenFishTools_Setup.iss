#define MyAppName       "OpenFishTools"
#ifndef MyAppVersion
  #define MyAppVersion  "1.0.95"
#endif
#define MyAppPublisher  "cutefishaep"
#define MyAppURL        "https://github.com/cutefishaep/OpenFishTools"
#define MyBundleID      "com.cutefish.tools"
#define MySourceRoot    "..\.."

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={commonpf32}\Common Files\Adobe\CEP\extensions\{#MyAppName}
DirExistsWarning=no
DisableDirPage=yes
DisableProgramGroupPage=yes
DefaultGroupName={#MyAppName}
OutputDir=.
OutputBaseFilename={#MyAppName}_Setup
SetupIconFile=
Compression=lzma2/ultra64
SolidCompression=yes
LZMANumBlockThreads=4
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=
UninstallDisplayName={#MyAppName} v{#MyAppVersion}
CreateUninstallRegKey=yes
UninstallDisplayIcon={app}\client\assets\Logo.svg
LicenseFile=..\..\LICENSE
WizardStyle=modern
WizardResizable=no
ShowLanguageDialog=no
ShowTasksTreeLines=yes
MinVersion=10.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
WelcomeLabel1=Welcome to the [name] Setup Wizard
WelcomeLabel2=This wizard will install [name/ver], a CEP extension for Adobe After Effects.%n%nPlease close Adobe After Effects before continuing.%n%nPlayerDebugMode will be enabled automatically for CC 2018 through CC 2027.%n%nDisclaimer: OpenFishTools is an independent extension. Adobe and After Effects are trademarks of Adobe Inc. OpenFishTools is not affiliated with or endorsed by Adobe Inc.
FinishedHeadingLabel=Installation Complete
FinishedLabel=OpenFishTools has been installed successfully.%n%nOpen Adobe After Effects and select Window > Extensions > Fish Tools to launch the panel.

[Files]
Source: "{#MySourceRoot}\CSXS\*";   DestDir: "{app}\CSXS";   Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#MySourceRoot}\client\*"; DestDir: "{app}\client"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#MySourceRoot}\host\*";   DestDir: "{app}\host";   Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#MySourceRoot}\data\*";   DestDir: "{app}\data";   Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#MySourceRoot}\Logo.svg"; DestDir: "{app}";         Flags: ignoreversion

[Registry]
Root: HKCU; Subkey: "Software\Adobe\CSXS.9";  ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKCU; Subkey: "Software\Adobe\CSXS.10"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKCU; Subkey: "Software\Adobe\CSXS.11"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKCU; Subkey: "Software\Adobe\CSXS.12"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist

Root: HKLM; Subkey: "Software\Adobe\CSXS.9";  ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKLM; Subkey: "Software\Adobe\CSXS.10"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKLM; Subkey: "Software\Adobe\CSXS.11"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKLM; Subkey: "Software\Adobe\CSXS.12"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist

Root: HKCU; Subkey: "Software\Wow6432Node\Adobe\CSXS.9";  ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKCU; Subkey: "Software\Wow6432Node\Adobe\CSXS.10"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKCU; Subkey: "Software\Wow6432Node\Adobe\CSXS.11"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKCU; Subkey: "Software\Wow6432Node\Adobe\CSXS.12"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKLM; Subkey: "Software\Wow6432Node\Adobe\CSXS.9";  ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKLM; Subkey: "Software\Wow6432Node\Adobe\CSXS.10"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKLM; Subkey: "Software\Wow6432Node\Adobe\CSXS.11"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist
Root: HKLM; Subkey: "Software\Wow6432Node\Adobe\CSXS.12"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: createvalueifdoesntexist

[Code]
var
  RemoveDebugMode: Boolean;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if CheckForMutexes('Adobe After Effects') then begin
    MsgBox(
      'Adobe After Effects appears to be running.' + #13#10 +
      'Please close it before continuing the installation.' + #13#10#13#10 +
      'The installer will continue, but you must restart After Effects afterwards.',
      mbInformation,
      MB_OK
    );
  end;
end;

function InitializeUninstall(): Boolean;
begin
  Result := True;
  if MsgBox(
    'Do you want to remove Adobe CEP PlayerDebugMode settings from the registry?' + #13#10 +
    'Select "Yes" to remove it (this may affect other custom or unsigned CEP extensions).' + #13#10 +
    'Select "No" to only remove OpenFishTools and keep PlayerDebugMode enabled.',
    mbConfirmation,
    MB_YESNO or MB_DEFBUTTON2
  ) = idYes then begin
    RemoveDebugMode := True;
  end else begin
    RemoveDebugMode := False;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then begin
    if RemoveDebugMode then begin
      RegDeleteValue(HKCU, 'Software\Adobe\CSXS.9', 'PlayerDebugMode');
      RegDeleteValue(HKCU, 'Software\Adobe\CSXS.10', 'PlayerDebugMode');
      RegDeleteValue(HKCU, 'Software\Adobe\CSXS.11', 'PlayerDebugMode');
      RegDeleteValue(HKCU, 'Software\Adobe\CSXS.12', 'PlayerDebugMode');
      
      RegDeleteValue(HKLM, 'Software\Adobe\CSXS.9', 'PlayerDebugMode');
      RegDeleteValue(HKLM, 'Software\Adobe\CSXS.10', 'PlayerDebugMode');
      RegDeleteValue(HKLM, 'Software\Adobe\CSXS.11', 'PlayerDebugMode');
      RegDeleteValue(HKLM, 'Software\Adobe\CSXS.12', 'PlayerDebugMode');
      
      RegDeleteValue(HKCU, 'Software\Wow6432Node\Adobe\CSXS.9', 'PlayerDebugMode');
      RegDeleteValue(HKCU, 'Software\Wow6432Node\Adobe\CSXS.10', 'PlayerDebugMode');
      RegDeleteValue(HKCU, 'Software\Wow6432Node\Adobe\CSXS.11', 'PlayerDebugMode');
      RegDeleteValue(HKCU, 'Software\Wow6432Node\Adobe\CSXS.12', 'PlayerDebugMode');
      
      RegDeleteValue(HKLM, 'Software\Wow6432Node\Adobe\CSXS.9', 'PlayerDebugMode');
      RegDeleteValue(HKLM, 'Software\Wow6432Node\Adobe\CSXS.10', 'PlayerDebugMode');
      RegDeleteValue(HKLM, 'Software\Wow6432Node\Adobe\CSXS.11', 'PlayerDebugMode');
      RegDeleteValue(HKLM, 'Software\Wow6432Node\Adobe\CSXS.12', 'PlayerDebugMode');
    end;
  end;
  
  if CurUninstallStep = usPostUninstall then begin
    if RemoveDebugMode then begin
      MsgBox(
        'OpenFishTools has been uninstalled.' + #13#10#13#10 +
        'Note: PlayerDebugMode registry values have been removed.' + #13#10 +
        'If you have other unsigned CEP extensions, you may need to re-enable PlayerDebugMode manually.',
        mbInformation,
        MB_OK
      );
    end else begin
      MsgBox(
        'OpenFishTools has been uninstalled.' + #13#10#13#10 +
        'PlayerDebugMode registry values were kept intact.',
        mbInformation,
        MB_OK
      );
    end;
  end;
end;
