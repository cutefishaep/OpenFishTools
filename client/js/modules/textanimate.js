'use strict';

window.TextAnimateModule = (function () {

    function _q(id) { return document.getElementById(id); }

    function _markerLookup() {
        return [
            'var mIn = thisLayer.inPoint + inDur;',
            'try { mIn = thisLayer.marker.key("IN").time; } catch(e) {',
            '  try { mIn = thisLayer.marker.key("in").time; } catch(e) {}',
            '}',
            'var mOut = thisLayer.outPoint - outDur;',
            'try { mOut = thisLayer.marker.key("OUT").time; } catch(e) {',
            '  try { mOut = thisLayer.marker.key("out").time; } catch(e) {}',
            '}'
        ].join('\n');
    }

    var PRESETS = {
        BOUNCE_UP:    { label:'Bounce Up',    posY: 80,   posX: 0,    scale:null, rotation:null, bounce:true,  freq:3.0, decay:7.0, delay:0.025 },
        BOUNCE_DOWN:  { label:'Bounce Down',  posY:-80,   posX: 0,    scale:null, rotation:null, bounce:true,  freq:3.0, decay:7.0, delay:0.025 },
        BOUNCE_LEFT:  { label:'Bounce Left',  posY: 0,    posX: 100,  scale:null, rotation:null, bounce:true,  freq:3.0, decay:7.0, delay:0.025 },
        BOUNCE_RIGHT: { label:'Bounce Right', posY: 0,    posX:-100,  scale:null, rotation:null, bounce:true,  freq:3.0, decay:7.0, delay:0.025 },
        FADE_UP:      { label:'Fade Up',      posY: 50,   posX: 0,    scale:null, rotation:null, bounce:false, freq:3.0, decay:7.0, delay:0.025 },
        FADE_DOWN:    { label:'Fade Down',    posY:-50,   posX: 0,    scale:null, rotation:null, bounce:false, freq:3.0, decay:7.0, delay:0.025 },
        SLIDE_LEFT:   { label:'Slide Left',   posY: 0,    posX: 120,  scale:null, rotation:null, bounce:false, freq:3.0, decay:7.0, delay:0.025 },
        SLIDE_RIGHT:  { label:'Slide Right',  posY: 0,    posX:-120,  scale:null, rotation:null, bounce:false, freq:3.0, decay:7.0, delay:0.025 },
        SCALE_POP:    { label:'Scale Pop',    posY: 0,    posX: 0,    scale:[0,0],rotation:null, bounce:true,  freq:3.0, decay:7.0, delay:0.025 },
        TYPEWRITER:   { label:'Typewriter',   posY: 0,    posX: 0,    scale:null, rotation:null, bounce:false, freq:3.0, decay:7.0, delay:0.025, typewriter:true },
        SPIN_IN:      { label:'Spin In',      posY: 0,    posX: 0,    scale:[0,0],rotation:-90,  bounce:false, freq:3.0, decay:7.0, delay:0.025 },
        // Cutefish Choice Presets
        CF_1:         { label:'Cutefish 1',   posY: -80,  posX: 0,    scale:[0,0],rotation:null, bounce:true,  freq:3.0, decay:7.0, delay:0.020, tracking:20,  cf: 1 },
        CF_2:         { label:'Cutefish 2',   posY: 80,   posX: 0,    scale:[0,0],rotation: 90,  bounce:true,  freq:2.0, decay:9.0, delay:0.033, tracking:20,  cf: 2 },
        CF_3:         { label:'Cutefish 3',   posY: 0,    posX: 0,    scale:[0,0],rotation:-90,  bounce:true,  freq:2.0, decay:8.0, delay:0.060, tracking:20,  cf: 3 },
        CF_4:         { label:'Cutefish 4',   posY: 0,    posX: 0,    scale:[0,0],rotation:null, bounce:true,  freq:1.0, decay:8.0, delay:0.033,                 cf: 4 }
    };

    function _esc(str) {
        return str.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n');
    }

    function _buildOffsetExpr(inDur, outDur, bounce, cf, defFreq, defDecay, defDelay) {
        var lines = [
            'var inDur=' + inDur + ',outDur=' + outDur + ';',
            _markerLookup(),
            'var freq = ' + defFreq + ';',
            'var decay = ' + defDecay + ';',
            'var delay = ' + defDelay + ';',
            'try {',
            '  freq = thisLayer.effect("Animation Frequency")("Slider");',
            '  decay = thisLayer.effect("Animation Decay")("Slider");',
            '  delay = thisLayer.effect("Stagger Delay")("Slider");',
            '} catch(e) {}'
        ];

        var transInDur = 0.35;
        if (cf === 4) transInDur = 0.45;
        else if (cf === 2) transInDur = 0.25;
        else if (cf === 1 || cf === 3) transInDur = 0.35;
        else if (bounce) transInDur = 0.35;
        else transInDur = 0.25;

        lines.push(
            'var transInDur = ' + transInDur + ';',
            'var totalInTime = mIn - thisLayer.inPoint;',
            'var maxStaggerIn = Math.max(0, totalInTime - transInDur);',
            'var autoDelayIn = textTotal > 1 ? maxStaggerIn / (textTotal - 1) : 0;',
            'var delayIn = Math.min(delay, autoDelayIn);',
            'var tInStart = thisLayer.inPoint + delayIn * (textIndex - 1);',
            '',
            'var transOutDur = 0.20;',
            'var totalOutTime = thisLayer.outPoint - mOut;',
            'var maxStaggerOut = Math.max(0, totalOutTime - transOutDur);',
            'var autoDelayOut = textTotal > 1 ? maxStaggerOut / (textTotal - 1) : 0;',
            'var delayOut = Math.min(delay, autoDelayOut);',
            'var tOutStart = mOut + delayOut * (textIndex - 1);',
            'var res;',
            'if(time<mOut){',
            '  var t=time-tInStart;',
            '  if(t<0){',
            '    res=[100,100,100];',
            '  }else{'
        );

        if (cf === 2) {
            lines.push(
                '    var dur = 0.10;',
                '    var startVal = [100, 100, 100];',
                '    var endVal = [0, 0, 0];',
                '    if (t < dur) {',
                '      res = linear(t, 0, dur, startVal, endVal);',
                '    } else {',
                '      var amp = (endVal - startVal) / dur;',
                '      var w = freq * Math.PI * 2;',
                '      res = endVal + amp * (Math.sin((t - dur) * w) / Math.exp(decay * (t - dur)) / w);',
                '    }'
            );
        } else if (cf === 4) {
            lines.push(
                '    var dur = 0.25;',
                '    var startVal = [100, 100, 100];',
                '    var endVal = [0, 0, 0];',
                '    if (t < dur) {',
                '      res = linear(t, 0, dur, startVal, endVal);',
                '    } else {',
                '      var amp = (endVal - startVal) / dur;',
                '      var w = freq * Math.PI * 2;',
                '      res = endVal + amp * (Math.sin((t - dur) * w) / Math.exp(decay * (t - dur)) / w);',
                '    }'
            );
        } else if (cf === 1 || cf === 3) {
            lines.push(
                '    var s = 100 * Math.cos(freq * t * 2 * Math.PI) / Math.exp(decay * t);',
                '    res = [s, s, s];'
            );
        } else {
            if (bounce) {
                lines.push(
                    '    var s = 100 * Math.cos(freq * t * 2 * Math.PI) / Math.exp(decay * t);',
                    '    res = [s, s, s];'
                );
            } else {
                lines.push(
                    '    res = easeOut(t, 0, 0.25, [100, 100, 100], [0, 0, 0]);'
                );
            }
        }

        lines.push(
            '  }',
            '}else{',
            '  var t=time-tOutStart;',
            '  if(t<0){',
            '    res=[0,0,0];',
            '  }else{',
            '    res = easeOut(t,0,0.20,[0,0,0],[100,100,100]);',
            '  }',
            '}',
            'res;'
        );
        return lines.join('\n');
    }

    function _buildScript(presetKey, inDur, outDur, basedOnVal) {
        var p = PRESETS[presetKey];
        if (!p) return 'JSON.stringify({error:true,message:"Unknown preset."})';

        var delayMult = 1.0;
        if (basedOnVal === 3) { delayMult = 5.0; }      // Words
        else if (basedOnVal === 4) { delayMult = 10.0; }    // Lines

        var presetDelay = p.delay || 0.025;
        var finalDelay = presetDelay * delayMult;

        var offsetExpr = _esc(_buildOffsetExpr(inDur, outDur, !!p.bounce, p.cf, p.freq || 3.0, p.decay || 7.0, finalDelay));

        var propsCode = [];

        if (p.posX !== 0 || p.posY !== 0) {
            propsCode.push(
                '    try{',
                '      var _pp;',
                '      try{ _pp=_animProps.addProperty("ADBE Text Position 3D"); }catch(e){ _pp=_animProps.addProperty("ADBE Text Position"); }',
                '      _pp.setValue([' + p.posX + ',' + p.posY + ']);',
                '    }catch(_pe){}'
            );
        }

        if (p.scale) {
            propsCode.push(
                '    try{',
                '      var _sp;',
                '      try{ _sp=_animProps.addProperty("ADBE Text Scale 3D"); }catch(e){ _sp=_animProps.addProperty("ADBE Text Scale"); }',
                '      _sp.setValue(' + JSON.stringify(p.scale) + ');',
                '    }catch(_se){}'
            );
        }

        if (p.rotation !== null && p.rotation !== undefined) {
            propsCode.push(
                '    try{',
                '      var _rp;',
                '      try{ _rp=_animProps.addProperty("ADBE Text Rotation"); }catch(e){ _rp=_animProps.addProperty("ADBE Text Rotation 3D"); }',
                '      _rp.setValue(' + p.rotation + ');',
                '    }catch(_re){}'
            );
        }

        if (p.tracking !== null && p.tracking !== undefined) {
            propsCode.push(
                '    try{',
                '      var _tr=_animProps.addProperty("ADBE Text Tracking Amount");',
                '      _tr.setValue(' + p.tracking + ');',
                '    }catch(_te){}'
            );
        }

        propsCode.push(
            '    try{',
            '      var _op=_animProps.addProperty("ADBE Text Opacity");',
            '      _op.setValue(0);',
            '    }catch(_oe){}'
        );

        return [
            '(function(){',
            '  try{',
            '    var comp=app.project.activeItem;',
            '    if(!comp||(!(comp instanceof CompItem)))',
            '      return JSON.stringify({error:true,message:"No active composition."});',
            '    if(!comp.selectedLayers||comp.selectedLayers.length===0)',
            '      return JSON.stringify({error:true,message:"Please select a text layer first."});',
            '    var layer=comp.selectedLayers[0];',
            '    if(!(layer instanceof TextLayer))',
            '      return JSON.stringify({error:true,message:"Selected layer is not a text layer."});',
            '',
            '    var _animators=layer.property("ADBE Text Properties").property("ADBE Text Animators");',
            '    var hasExisting=false;',
            '    if(_animators){',
            '      for(var _i=1;_i<=_animators.numProperties;_i++){',
            '        if(_animators.property(_i).name.indexOf("FishTools - ")===0){',
            '          hasExisting=true; break;',
            '        }',
            '      }',
            '    }',
            '    if(hasExisting){',
            '      return JSON.stringify({error:true,isDuplicate:true,message:"Animasi sudah ada pada layer ini. Silakan hapus terlebih dahulu dengan mengklik tombol hapus (ikon tempat sampah) di bagian atas card Text Animate."});',
            '    }',
            '',
            '    var inDur=' + inDur + ', outDur=' + outDur + ';',
            '    var mIn=layer.inPoint+inDur;',
            '    var mOut=layer.outPoint-outDur;',
            '    if(mOut<=mIn) mOut=mIn+0.1;',
            '',
            '    app.beginUndoGroup("FishTools - ' + p.label + '");',
            '',
            '    var _effs=layer.property("ADBE Effect Parade");',
            '    if(_effs){',
            '      var _freqS = _effs.property("Animation Frequency") || _effs.addProperty("ADBE Slider Control");',
            '      _freqS.name = "Animation Frequency";',
            '      _freqS.property("ADBE Slider Control-0001").setValue(' + (p.freq || 3.0) + ');',
            '',
            '      var _decS = _effs.property("Animation Decay") || _effs.addProperty("ADBE Slider Control");',
            '      _decS.name = "Animation Decay";',
            '      _decS.property("ADBE Slider Control-0001").setValue(' + (p.decay || 7.0) + ');',
            '',
            '      var _delS = _effs.property("Stagger Delay") || _effs.addProperty("ADBE Slider Control");',
            '      _delS.name = "Stagger Delay";',
            '      _delS.property("ADBE Slider Control-0001").setValue(' + finalDelay + ');',
            '    }',
            '',
            '    var hasIn=false, hasOut=false;',
            '    for(var _m=1;_m<=layer.marker.numKeys;_m++){',
            '      var _mc=layer.marker.keyValue(_m).comment;',
            '      if(_mc==="IN"||_mc==="in") hasIn=true;',
            '      if(_mc==="OUT"||_mc==="out") hasOut=true;',
            '    }',
            '    if(!hasIn){ var _mv=new MarkerValue("IN"); layer.marker.setValueAtTime(mIn,_mv); }',
            '    if(!hasOut){ var _mv2=new MarkerValue("OUT"); layer.marker.setValueAtTime(mOut,_mv2); }',
            '',
            '    var _animators=layer.property("ADBE Text Properties").property("ADBE Text Animators");',
            '    var _anim=_animators.addProperty("ADBE Text Animator");',
            '    _anim.name="FishTools - ' + p.label + '";',
            '',
            '    var _selGrp=_anim.property("ADBE Text Selectors");',
            '    if(_selGrp){',
            '      while(_selGrp.numProperties>0){ _selGrp.property(1).remove(); }',
            '    }',
            '    var _sel=_selGrp.addProperty("ADBE Text Expressible Selector");',
            '    try{',
            '      var _type2=_sel.property("ADBE Text Range Type2") || _sel.property("Based On");',
            '      if(_type2){ _type2.setValue(' + basedOnVal + '); }',
            '    }catch(_te){}',
            '    try{',
            '      var _amtProp=_sel.property("ADBE Text Expressible Amount");',
            '      if(_amtProp){ _amtProp.expression="' + offsetExpr + '"; }',
            '    }catch(_xe){}',
            '',
            '    var _animProps=_anim.property("ADBE Text Animator Properties");',
            propsCode.join('\n'),
            '',
            '    app.endUndoGroup();',
            '    return JSON.stringify({error:false,message:"' + p.label + ' applied!"});',
            '  }catch(e){',
            '    try { app.endUndoGroup(); } catch(_ugErr) {}',
            '    return JSON.stringify({error:true,message:e.toString()});',
            '  }',
            '})()'
        ].join('\n');
    }

    function _applyPreset(presetKey) {
        if (!window.csInterface) {
            window.ModalModule.error('No AE connection.', 'Text Animate');
            return;
        }
        var inDur  = 0.5;
        var outDur = 0.4;
        var basedOnVal = parseInt((_q('ta-based-on') || {}).value) || 1;
        var script = _buildScript(presetKey, inDur, outDur, basedOnVal);

        window.csInterface.evalScript(script, function (res) {
            if (!res || res === 'undefined') return;
            try {
                var data = JSON.parse(res);
                if (data.error) {
                    if (data.isDuplicate) {
                        window.ModalModule.warn(data.message, 'Text Animate');
                    } else {
                        window.ModalModule.error(data.message, 'Text Animate');
                    }
                }
            } catch (e) {
                console.error('[TextAnimate]', e, res);
            }
        });
    }

    function _clearAnimation() {
        if (!window.csInterface) {
            window.ModalModule.error('No AE connection.', 'Text Animate');
            return;
        }

        var script = [
            '(function(){',
            '  try{',
            '    var comp = app.project.activeItem;',
            '    if(!comp || (!(comp instanceof CompItem)))',
            '      return JSON.stringify({error:true, message:"No active composition."});',
            '    if(!comp.selectedLayers || comp.selectedLayers.length === 0)',
            '      return JSON.stringify({error:true, message:"Please select a text layer first."});',
            '    var layer = comp.selectedLayers[0];',
            '    if(!(layer instanceof TextLayer))',
            '      return JSON.stringify({error:true, message:"Selected layer is not a text layer."});',
            '',
            '    app.beginUndoGroup("FishTools - Clear Text Animation");',
            '',
            '    var animators = layer.property("ADBE Text Properties").property("ADBE Text Animators");',
            '    if(animators) {',
            '      for(var i = animators.numProperties; i >= 1; i--) {',
            '        var anim = animators.property(i);',
            '        if(anim && anim.name && anim.name.indexOf("FishTools - ") === 0) {',
            '          anim.remove();',
            '        }',
            '      }',
            '    }',
            '',
            '    var effects = layer.property("ADBE Effect Parade");',
            '    if(effects) {',
            '      for(var j = effects.numProperties; j >= 1; j--) {',
            '        var fx = effects.property(j);',
            '        if(fx && (fx.name === "Animation Frequency" || fx.name === "Animation Decay" || fx.name === "Stagger Delay")) {',
            '          fx.remove();',
            '        }',
            '      }',
            '    }',
            '',
            '    var markers = layer.marker;',
            '    if(markers) {',
            '      for(var k = markers.numKeys; k >= 1; k--) {',
            '        var comment = markers.keyValue(k).comment;',
            '        if(comment === "IN" || comment === "in" || comment === "OUT" || comment === "out") {',
            '          markers.removeKey(k);',
            '        }',
            '      }',
            '    }',
            '',
            '    app.endUndoGroup();',
            '    return JSON.stringify({error:false, message:"Animation removed successfully."});',
            '  } catch(e) {',
            '    try { app.endUndoGroup(); } catch(_err) {}',
            '    return JSON.stringify({error:true, message:e.toString()});',
            '  }',
            '})()'
        ].join('\n');

        window.csInterface.evalScript(script, function (res) {
            if (!res || res === 'undefined') return;
            try {
                var data = JSON.parse(res);
                if (data.error) {
                    window.ModalModule.error(data.message, 'Text Animate');
                }
            } catch (e) {
                console.error('[TextAnimate]', e, res);
            }
        });
    }

    function init() {
        document.querySelectorAll('.ta-btn[data-preset]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var preset = btn.getAttribute('data-preset');
                btn.classList.add('tool-btn--active');
                setTimeout(function () { btn.classList.remove('tool-btn--active'); }, 220);
                _applyPreset(preset);
            });
        });

        var btnClear = _q('btn-ta-clear');
        if (btnClear) {
            btnClear.addEventListener('click', function () {
                btnClear.classList.add('tool-btn--active');
                setTimeout(function () { btnClear.classList.remove('tool-btn--active'); }, 220);
                _clearAnimation();
            });
        }
    }

    return { init: init };
})();
