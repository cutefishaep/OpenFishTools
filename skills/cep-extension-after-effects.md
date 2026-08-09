# Skill: CEP Extension After Effects

## Overview

CEP (Common Extensibility Platform) adalah platform untuk membuat panel UI menggunakan web technologies (HTML/CSS/JS) di dalam Adobe After Effects. Panel berjalan di Chromium Embedded Framework (CEF) dan berkomunikasi dengan After Effects via ExtendScript.

---

## Arsitektur

### Dua Context Utama

| Context | Lokasi | Bahasa | Fungsi |
|---------|--------|--------|--------|
| **Browser Context** | `client/` | HTML/CSS/JS (ES6+) | UI Panel |
| **Host Context** | `host/` | ExtendScript (ES3) | Akses After Effects DOM |

### Alur Komunikasi

```
Panel (JS) → CSInterface.evalScript() → ExtendScript (JSX) → After Effects DOM
                ↑                              ↓
                └──────── Callback ←───────────┘
```

---

## Struktur Folder

```
ExtensionName/
├── CSXS/
│   └── manifest.xml              ← Konfigurasi wajib
├── client/
│   ├── index.html                ← Entry point UI
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── libs/
│   │   │   └── CSInterface.js    ← Library komunikasi Adobe
│   │   ├── main.js               ← Inisialisasi panel
│   │   └── modules/              ← ES modules
│   └── assets/                   ← Icons, images
└── host/
    ├── index.jsx                 ← ExtendScript entry
    └── modules/                  ← Modular ExtendScript
        ├── core.jsx
        ├── layers.jsx
        └── effects.jsx
```

---

## manifest.xml

### Template Minimal

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionManifest Version="7.0" 
    ExtensionBundleId="com.developer.extensionname"
    ExtensionBundleVersion="1.0.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    
    <ExtensionList>
        <Extension Id="com.developer.extensionname.panel" Version="1.0.0" />
    </ExtensionList>
    
    <ExecutionEnvironment>
        <HostList>
            <Host Name="AEFT" Version="[12.0,99.9]"/>
        </HostList>
        <LocaleList>
            <Locale Code="All"/>
        </LocaleList>
        <RequiredRuntimeList>
            <RequiredRuntime Name="CSXS" Version="7.0"/>
        </RequiredRuntimeList>
    </ExecutionEnvironment>
    
    <DispatchInfoList>
        <Extension Id="com.developer.extensionname.panel">
            <DispatchInfo>
                <Resources>
                    <MainPath>./client/index.html</MainPath>
                    <ScriptPath>./host/index.jsx</ScriptPath>
                </Resources>
                <Lifecycle>
                    <AutoVisible>true</AutoVisible>
                </Lifecycle>
                <UI>
                    <Type>Panel</Type>
                    <Menu>Extension Name</Menu>
                    <Geometry>
                        <Size>
                            <Height>400</Height>
                            <Width>300</Width>
                        </Size>
                        <MinSize>
                            <Height>200</Height>
                            <Width>200</Width>
                        </MinSize>
                    </Geometry>
                    <Icons>
                        <Icon Type="Normal">./client/assets/icon.png</Icon>
                    </Icons>
                </UI>
            </DispatchInfo>
        </Extension>
    </DispatchInfoList>
</ExtensionManifest>
```

### Field Penting

| Field | Deskripsi |
|-------|-----------|
| `ExtensionBundleId` | ID unik reverse-domain (contoh: `com.mycompany.myext`) |
| `Extension Id` | ID panel, biasanya `BundleId.panel` |
| `Host Name="AEFT"` | After Effects host code |
| `Version="[12.0,99.9]"` | Range versi AE yang didukung |
| `RequiredRuntime Version="7.0"` | CEP version (7=CC2018, 9=CC2019, 10=2020, 11=2022+) |
| `Type="Panel"` | Tipe extension (Panel, Modal, Modeless) |

---

## CSInterface.js API

### Inisialisasi

```javascript
var csInterface = new CSInterface();
```

### evalScript (Komunikasi dengan ExtendScript)

```javascript
// Simple call
csInterface.evalScript("app.project.activeItem.name", function(result) {
    console.log(result);
});

// Dengan parameter (string interpolation)
var layerIndex = 1;
csInterface.evalScript('renameLayer(' + layerIndex + ', "New Name")', callback);

// Menggunakan function di file .jsx
csInterface.evalScript("myModule.myFunction(arg1, arg2)", callback);
```

### System Path

```javascript
var extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
var userDataPath = csInterface.getSystemPath(SystemPath.USER_DATA);
```

### Host Environment

```javascript
var hostInfo = JSON.parse(csInterface.getHostEnvironment());
var appVersion = hostInfo.appVersion;
var appName = hostInfo.appName;
```

### Theme

```javascript
// Listen theme changes
csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, function(e) {
    var skinInfo = JSON.parse(csInterface.getHostEnvironment()).appSkinInfo;
    // Update UI colors
});
```

### Flyout Menu

```javascript
var menuXML = '<Menu>' +
    '<MenuItem Id="item1" Label="Menu Item 1" Enabled="true" Checked="false"/>' +
    '<MenuSeparator />' +
    '<MenuItem Id="item2" Label="Menu Item 2" Enabled="true" Checked="false"/>' +
    '</Menu>';

csInterface.setPanelFlyoutMenu(menuXML);

csInterface.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", function(event) {
    if (event.data.menuId === "item1") {
        // Handle menu click
    }
});
```

---

## ExtendScript (After Effects DOM)

### Object Model

```
app (Application)
└── project (Project)
    └── items (ItemCollection) [1-based indexing]
        ├── FolderItem
        ├── FootageItem
        ├── CompItem (Composition)
        │   └── layers (LayerCollection)
        │       ├── AVLayer (footage, solid, precomp, null, adjustment)
        │       │   ├── TextLayer
        │       │   └── ShapeLayer
        │       ├── CameraLayer
        │       └── LightLayer
        └── RenderQueue
            └── RQItemCollection
```

### Indexing Rules

- **1-based** untuk semua AE collections (layers, properties, effects, keyframes)
- `comp.layer(1)` = layer pertama (topmost)
- `comp.selectedLayers` = JavaScript array (**0-based**)

### Akses Property via matchName

```jsx
// Transform properties
layer.property("ADBE Position")      // Position
layer.property("ADBE Opacity")       // Opacity
layer.property("ADBE Scale")         // Scale
layer.property("ADBE Rotate Z")      // Rotation

// Effects
layer.property("ADBE Effect Parade") // Effects container
layer.property("Effects").property("Gaussian Blur") // By name
layer.property("Effects").property("ADBE Gaussian Blur 2") // By matchName

// Masks
layer.property("ADBE Mask Parade")   // Masks container

// Text
layer.property("ADBE Text Properties")
layer.property("ADBE Text Document") // Source Text
```

### Common Operations

#### Cek Active Item

```jsx
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    alert("No active composition");
    return;
}
```

#### Layer Operations

```jsx
// Get layer
var layer = comp.layer(1);

// Selected layers (0-based array)
var selectedLayers = comp.selectedLayers;

// Check layer type
if (layer instanceof TextLayer) {
    // Text layer
} else if (layer instanceof ShapeLayer) {
    // Shape layer
} else if (layer instanceof AVLayer) {
    // AV layer (footage, solid, precomp, null)
}

// Layer flags
layer.locked           // Check/set lock
layer.visible          // Check/set visibility
layer.threeDLayer      // Check/set 3D
layer.adjustmentLayer  // Check if adjustment
layer.nullLayer        // Check if null
```

#### Create Layer

```jsx
// Add solid
var solid = comp.layers.addSolid(
    [1, 0, 0],           // Color [R, G, B] 0-1
    "Red Solid",          // Name
    comp.width,           // Width
    comp.height,          // Height
    1                     // Pixel aspect ratio
);

// Add text
var textDoc = new TextDocument("Hello");
textDoc.fontSize = 72;
textDoc.fillColor = [1, 1, 1];
var textLayer = comp.layers.addText(textDoc);

// Add null
var nullLayer = comp.layers.addNull();

// Add shape
var shapeLayer = comp.layers.addShape();

// Add camera
var camera = comp.layers.addCamera("Camera", [comp.width/2, comp.height/2]);

// Add light
var light = comp.layers.addLight("Light", [comp.width/2, comp.height/2]);
```

#### Effects

```jsx
// Add effect
var effects = layer.property("ADBE Effect Parade");
var blur = effects.addProperty("ADBE Gaussian Blur 2");

// Set parameter
blur.property("ADBE Gaussian Blur 2-0001").setValue(10); // Blurriness

// Get effect
var myEffect = layer.property("Effects").property("Gaussian Blur");

// Remove effect (reverse order for multiple!)
for (var i = effects.numProperties; i >= 1; i--) {
    effects.property(i).remove();
}
```

#### Keyframes

```jsx
var prop = layer.property("ADBE Position");

// Add keyframes
prop.setValueAtTime(0, [100, 100]);
prop.setValueAtTime(1, [500, 500]);

// Get keyframe info
var numKeys = prop.numKeys;
var keyTime = prop.keyTime(1);      // Time of keyframe 1
var keyValue = prop.keyValue(1);    // Value of keyframe 1

// Set interpolation
prop.setInterpolationTypeAtKey(1, 
    KeyframeInterpolationType.BEZIER,
    KeyframeInterpolationType.BEZIER
);

// Set temporal ease
prop.setTemporalEaseAtKey(1,
    [new KeyframeEase(0, 33.33)],  // In
    [new KeyframeEase(0, 33.33)]   // Out
);
```

#### Composition

```jsx
// Create composition
var newComp = app.project.items.addComp(
    "My Comp",    // Name
    1920,         // Width
    1080,         // Height
    1,            // Pixel aspect ratio
    10,           // Duration (seconds)
    30            // Frame rate
);

// Precompose
var indices = [1, 2, 3]; // 1-based layer indices
var precomp = comp.layers.precompose(indices, "Precomp Name", true);
```

### Undo Group

```jsx
app.beginUndoGroup("My Action");
try {
    // ... do something
} catch (e) {
    alert("Error: " + e.toString());
} finally {
    app.endUndoGroup();
}
```

---

## Node.js Integration

### Cek Node.js

```javascript
if (typeof cep_node !== 'undefined') {
    // Node.js available
    var fs = cep_node.require('fs');
}
```

### File System via cep.fs

```javascript
// Read file
var result = window.cep.fs.readFile("/path/to/file.txt");
if (result.err === 0) {
    var content = result.data;
}

// Write file
window.cep.fs.writeFile("/path/to/file.txt", "content");

// Check file exists
var stat = window.cep.fs.stat("/path/to/file");
```

### Require Node Modules

```javascript
// Place node_modules in extension root
var path = cep_node.require('path');
var fs = cep_node.require('fs');

var files = fs.readdirSync('/some/path');
```

---

## Event System

### Listen Events

```javascript
csInterface.addEventListener("com.adobe.csxs.events.ThemeColorChanged", 
    function(event) {
        console.log("Theme changed:", event.data);
    }
);
```

### Dispatch Events

```javascript
var event = new CSEvent("MY_CUSTOM_EVENT", "APPLICATION");
event.data = JSON.stringify({ key: "value" });
csInterface.dispatchEvent(event);
```

### Built-in Events

| Event | Deskripsi |
|-------|-----------|
| `com.adobe.csxs.events.ThemeColorChanged` | Theme berubah |
| `com.adobe.csxs.events.flyoutMenuClicked` | Flyout menu diklik |
| `com.adobe.csxs.events.applicationActivated` | AE activated |
| `com.adobe.csxs.events.applicationDeactivated` | AE deactivated |

---

## Setup Development

### Enable Debug Mode

**Windows:**
```
HKEY_CURRENT_USER\Software\Adobe\CSXS.11
PlayerDebugMode = "1"
```

**Mac:**
```bash
defaults write com.adobe.CSXS.PlayerDebugMode 1
```

### Install Extension

**Development (user-level):**
- Windows: `%APPDATA%\Adobe\CEP\extensions\`
- Mac: `~/Library/Application Support/Adobe/CEP/extensions/`

**System-wide:**
- Windows: `%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions\`
- Mac: `/Library/Application Support/Adobe/CEP/extensions/`

### After Effects Settings

Edit > Preferences > Scripting & Expressions:
- ✅ Allow Scripts to Write Files and Access Network

---

## CEP Version Map

| After Effects | CEP Version | Chromium | Node.js |
|---------------|-------------|----------|---------|
| CC 2014 (13.0) | CEP 6 | - | - |
| CC 2015 (14.0) | CEP 6 | - | - |
| CC 2017 (15.0) | CEP 8 | - | - |
| CC 2018 (16.0) | CEP 9 | - | - |
| CC 2019 (17.0) | CEP 9 | - | - |
| 2020 (17.1) | CEP 10 | - | - |
| 2022+ | CEP 11 | Chromium 88 | Node 15 |

---

## Best Practices

### Performance

1. **Minimalkan evalScript calls** - Setiap panggilan lambat (~ms)
2. **Batch operasi** - Kirim satu fungsi besar daripada banyak fungsi kecil
3. **Cache data** - Simpan hasil di JS, jangan query berulang
4. **Gunakan persistent engine** untuk ExtendScript caching

### Security

1. **Jangan expose secrets** di panel JS
2. **Validate input** dari user sebelum dikirim ke ExtendScript
3. **Sanitize filenames** jika operasi file

### Code Organization

1. **Modular ExtendScript** - Gunakan `#include` untuk split file
2. **Modular JS** - Gunakan ES modules atau namespacing
3. **Separation of concerns** - UI di client, logic di host

### Error Handling

```jsx
// ExtendScript
app.beginUndoGroup("Action");
try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "No active composition";
    }
    // ... do something
    return "Success";
} catch (e) {
    return "Error: " + e.toString();
} finally {
    app.endUndoGroup();
}
```

```javascript
// Panel JS
csInterface.evalScript("myFunction()", function(result) {
    if (result.indexOf("Error") === 0) {
        console.error(result);
    } else {
        console.log(result);
    }
});
```

---

## Common matchNames

### Effects

| Effect | matchName |
|--------|-----------|
| Gaussian Blur | `ADBE Gaussian Blur 2` |
| Fill | `ADBE Fill` |
| Tint | `ADBE Tint` |
| Curves | `ADBE CurvesCustom` |
| Hue/Saturation | `ADBE HUE SATURATION` |
| Drop Shadow | `ADBE Drop Shadow` |
| Glow | `ADBE Glo2` |

### Layer Properties

| Property | matchName |
|----------|-----------|
| Position | `ADBE Position` |
| Scale | `ADBE Scale` |
| Rotation | `ADBE Rotate Z` |
| Opacity | `ADBE Opacity` |
| Anchor Point | `ADBE Anchor Point` |
| Time Remap | `ADBE Time Remapping` |

---

## Troubleshooting

### Extension Tidak Muncul

1. Cek `manifest.xml` path benar
2. Pastikan `PlayerDebugMode = 1`
3. Restart After Effects
4. Cek versi AE cocok dengan Host Version range

### evalScript Error

1. Pastikan fungsi ada di file .jsx yang di-include
2. Cek syntax ExtendScript (ES3, bukan ES6)
3. Gunakan `try-catch` di ExtendScript
4. Log result di callback

### Panel Tidak Load

1. Buka DevTools: `Ctrl+Shift+I` (Windows) atau `Cmd+Opt+I` (Mac)
2. Cek console untuk errors
3. Pastikan `CSInterface.js` ter-load

---

## References

- [Adobe CEP Resources](https://github.com/Adobe-CEP/CEP-Resources)
- [After Effects Scripting Guide](https://ae-scripting.docsforadobe.dev/)
- [CEP Cookbook](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_8.x/Documentation/CEP%208.0%20HTML%20Extension%20Cookbook.md)
- [CSInterface.js API](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_8.x/CSInterface.js)
