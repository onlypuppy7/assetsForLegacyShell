"use strict";

function BulletActor(e) {
    this.bullet = e, this.mesh = scene.getMeshByName("bullet").createInstance(""), this.mesh.setEnabled(!1)
}

function loadResources(e, i) {
    Sounds = {}, loadMaterials(e), loadSounds(e, function () {
        loadObjectMeshes(e, function () {
            loadMapMeshes(e, function () {
                i()
            })
        })
    })
}

function setupLights() {
    gameScene.ambientColor = new BABYLON.Color3(.2, .2, .2), gameScene.fogMode = BABYLON.Scene.FOGMODE_EXP, gameScene.fogColor = new BABYLON.Color4(.5, .7, .9, 1), gameScene.fogDensity = .025, gameScene.clearColor = BABYLON.Color3.Black();
    var e = new BABYLON.DirectionalLight("", new BABYLON.Vector3(0, -1, 0), gameScene);
    e.intensity = 1.2, e.autoUpdateExtends = !1, e.shadowMinZ = .05, e.shadowMaxZ = 40, e.shadowFrustumSize = 15, (shadowGen = new BABYLON.ShadowGenerator(1024, e)).forceBackFacesOnly = !0;
    var i = new BABYLON.HemisphericLight("light2", new BABYLON.Vector3(-.25, 1, -.5), gameScene);
    return i.intensity = .8, (i = new BABYLON.HemisphericLight("light3", new BABYLON.Vector3(0, -1, 0), gameScene)).intensity = .25, e
}

function beginAnimation(e, i, t, r, d) {
    gameScene.beginAnimation(e, i, t, r, d);
    for (var a = e.getChildMeshes(), n = 0; n < a.length; n++) gameScene.beginAnimation(a[n], i, t, r, d)
}

function startGame() {
    highestPing = 0, players = [], keyIsDown = {}, inputTally = "WASDERQ ", respawnTime = 1e5, me = null, lastTimeStamp = performance.now(), lastDelta = 0, fps = Array(60).fill(0), fpsSum = 0, fpsIdx = 0, pingTotal = 0, pingSamples = 0, fpsTotal = 0, fpsSamples = 0, kills = 0, deaths = 0, bestKillStreak = 0, queueVideoAd = !1, gameStartTime = Date.now(), nextPingSample = Date.now() + 1e3, engine.clear(BABYLON.Color3.Black()), engine.stopRenderLoop(), gameScene = new BABYLON.Scene(engine), scene = gameScene, settings.autoDetail || (gameScene.shadowsEnabled = settings.shadowsEnabled), gameScene.autoClear = !1, gameScene.autoClearDepthAndStencil = !1, settings.autoDetail && enableAutoDetail(), light = setupLights(), camera = new BABYLON.TargetCamera("camera", BABYLON.Vector3.Zero(), gameScene), gameScene.activeCameras.push(camera), camera.maxZ = 1e3, camera.fov = 1.25, camera.minZ = .05, (uiCamera = new BABYLON.FreeCamera("uiCamera", new BABYLON.Vector3(0, 0, -1), gameScene)).mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA, uiCamera.layerMask = 536870912, gameScene.activeCameras.push(uiCamera), window.onfocus = function () {
        lastTimeStamp = performance.now()
    }, window.onblur = function () {
        document.exitPointerLock()
    }, document.onpointerlockchange = function () {
        if (me && !document.pointerLockElement) {
            lastKey = null, me.controlKeys = 0;
            var e = new Comm.output(2);
            e.packInt8(Comm.controlKeys), e.packInt8(me.controlKeys), ws.send(e.buffer)
        }
    }, resetGameUI(), document.getElementById("aipGameContainer").appendChild(aipBanner), document.body.style.overflow = "hidden", loadResources(gameScene, onLoadingComplete)
}

function onCanvasClick(e) {
    !me || me.isDead() || document.pointerLockElement || (canvas.requestPointerLock(), chatting && chatInEl.focus())
}

function respawn() {
    if (console.log("Respawn pressed - respawnTime: " + respawnTime), respawnTime < 0)
        if (queueVideoAd) playVideoAd(), console.log("respawn() called playVideoAd()");
        else {
            interval.clearAll(), timeout.clearAll(), document.getElementById("aipGameContainer").style.display = "none", document.getElementById("gameCustomizeButton").style.display = "none", document.getElementById("deathBox").style.display = "none", console.log("respawn() hides deathBox element and gameCustomizeButton"), document.getElementById("spawnBox").style.display = "none", addCanvasListeners(), document.pointerLockElement || canvas.requestPointerLock(), chatting && chatInEl.focus();
            var e = new Comm.output(1);
            e.packInt8(Comm.requestRespawn), ws.send(e.buffer), console.log("respawn() requests respawn from server")
        }
}

function applyDeadZone(e, i) {
    var t = (Math.abs(e) - i) / (1 - i);
    return t < 0 && (t = 0), t * (e > 0 ? 1 : -1)
}

function pollGamepad(e) {
    var i = navigator.getGamepads ? navigator.getGamepads() : navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : [];
    if (i[0]) {
        var t = i[0],
            r = 5e-4 * settings.mouseSensitivity + .001;
        me.actor.scope && (r *= .3);
        var d = applyDeadZone(t.axes[2], .25),
            a = applyDeadZone(t.axes[3], .25);
        d = Math.pow(5 * d, 2) * Math.sign(d), a = Math.pow(5 * a, 2) * Math.sign(a), me.viewYaw = Math.radAdd(me.viewYaw, d * r), me.pitch = Math.max(Math.min(me.pitch + a * settings.mouseInvert * r, 1.5), -1.5), freezeFrame && (me.moveYaw = me.viewYaw);
        var n = applyDeadZone(t.axes[0], .25),
            o = applyDeadZone(t.axes[1], .25),
            s = 0;
        if (n < 0 && (s |= 4), n > 0 && (s |= 8), o < 0 && (s |= 1), o > 0 && (s |= 2), s != me.controlKeys) {
            me.controlKeys = s, me.previousStates[me.stateIdx].controlKeys = me.controlKeys;
            var y = new Comm.output(2);
            y.packInt8(Comm.controlKeys), y.packInt8(me.controlKeys), ws.send(y.buffer)
        }
        t.buttons[7].value > .25 && !gamepadState.fire ? (gamepadState.fire = !0, handleInputDown("fire")) : t.buttons[7].value <= .25 && gamepadState.fire && (gamepadState.fire = !1, handleInputUp("fire")), t.buttons[0].value > .25 && !gamepadState.jump ? (gamepadState.jump = !0, handleInputDown("jump")) : t.buttons[0].value <= .25 && gamepadState.jump && (gamepadState.jump = !1, handleInputUp("jump")), t.buttons[6].value > .25 && !gamepadState.scope ? (gamepadState.scope = !0, handleInputDown("scope")) : t.buttons[6].value <= .25 && gamepadState.scope && (gamepadState.scope = !1, handleInputUp("scope")), t.buttons[2].value > .25 && !gamepadState.reload ? (gamepadState.reload = !0, handleInputDown("reload")) : t.buttons[2].value <= .25 && gamepadState.reload && (gamepadState.reload = !1, handleInputUp("reload")), t.buttons[12].value > .25 && !gamepadState.weapon ? (gamepadState.weapon = !0, handleInputDown("weapon")) : t.buttons[12].value <= .25 && gamepadState.weapon && (gamepadState.weapon = !1, handleInputUp("weapon"))
    }
}

function onCanvasMouseDown(e) {
    inputDown("MOUSE " + e.button), 1 == e.button && e.preventDefault()
}

function onCanvasMouseUp(e) {
    inputUp("MOUSE " + e.button)
}

function onCanvasMouseMove(e) {
    if (document.pointerLockElement && me && me.hp > 0) {
        var i = 5e-4 * settings.mouseSensitivity + .001;
        me.actor.scope && (i *= .3);
        var t = e.movementX;
        lastMouseMovement.x && Math.sign(t) != Math.sign(lastMouseMovement.x) && (t = 0), lastMouseMovement.x = t;
        var r = e.movementY;
        lastMouseMovement.y && Math.sign(r) != Math.sign(lastMouseMovement.y) && (r = 0), lastMouseMovement.y = r, me.viewYaw = Math.radAdd(me.viewYaw, t * i), me.pitch = Math.max(Math.min(me.pitch + r * settings.mouseInvert * i, 1.5), -1.5), freezeFrame && (me.moveYaw = me.viewYaw)
    }
}

function addExplosionSprite(e, i, t, r, d, a, n, o, s) {
    var y = new BABYLON.Sprite("", e);
    y.animSpeed = i, y.position.x = t, y.position.y = r, y.position.z = d, y.baseSize = s, y.dx = a, y.dy = n, y.dz = o, y.df = 0, y.anim = 0, y.color.r = smokeColor.r, y.color.g = smokeColor.g, y.color.b = smokeColor.b, y.color.a = smokeColor.a
}

function addExplosion(e, i, t, r) {
    for (var d = 0; d < Math.floor(r / 2); d++) {
        var a = .04 * Math.random() + .02,
            n = 1 * Math.random() + .5,
            o = .5 * (.9 - n),
            s = (2 * Math.random() - 1) * o,
            y = (2 * Math.random() - 1) * o + .1,
            x = (2 * Math.random() - 1) * o;
        addExplosionSprite(explosionSmokeManager, a, e, i, t, s, y, x, n), addExplosionSprite(explosionFireManager, a, e, i, t, s, y, x, n)
    }
    if (me) {
        var l = Math.length3(me.x - e, me.y - i, me.z - t);
        l < 5 && (shake = Math.min(7, shake + Math.clamp(r - 25 * l, 0, 5)))
    }
}

function lerp(e, i, t) {
    for (var r = e.length - 1; r >= 0; r--)
        if (i >= e[r].pos) return void BABYLON.Color4.LerpToRef(e[r].color, e[r + 1].color, (i - e[r].pos) * (1 / (e[r + 1].pos - e[r].pos)), t)
}

function updateExplosions(e, i) {
    for (var t = 0; t < e.sprites.length; t++) {
        var r = e.sprites[t];
        r.size = r.baseSize * (1 - r.anim), e == explosionFireManager && lerp(fireColors, r.anim, r.color), r.position.x += r.dx, r.position.y += r.dy, r.position.z += r.dz, collidesWithCell(r.position.x, r.position.y, r.position.z) ? (r.dx = 0, r.dy = 0, r.dz = 0) : r.position.y += .01 * Math.cos(r.anim * Math.PI), r.dx *= .7, r.dy *= .7, r.dz *= .7, r.anim += i * r.animSpeed + .01, r.animSpeed *= .85, r.anim >= 1 && r.dispose()
    }
}

function onLoadingComplete() {
    try {
        if (scope = new Scope, hitIndicator = new HitIndicator, reticle = new Reticle, scene.getMeshByName("muzzleFlash").material = scene.getMaterialByName("muzzleFlash"), scene.getMeshByName("bullet").material = scene.getMaterialByName("bullet"), scene.getMeshByName("eggWhite").material = scene.getMaterialByName("eggWhite"), scene.getMeshByName("eggYolk").material = scene.getMaterialByName("eggYolk"), scene.getMeshByName("grenade").material = scene.getMaterialByName("emissive"), scene.getMeshByName("ammo").material = scene.getMaterialByName("standardInstanced"), scene.getMeshByName("grenadeItem").material = scene.getMaterialByName("standardInstanced"), munitionsManager = new MunitionsManager, itemManager = new ItemManager, buildMapMesh(), nameTexture = new BABYLON.DynamicTexture("", 2048, gameScene, !0, 2), nameSprites = new BABYLON.SpriteManager("", "", 24, {
                width: 512,
                height: 256
            }, gameScene), nameSprites.fogEnabled = !1, nameSprites.texture = nameTexture, bulletHoleManager = new BABYLON.SpriteManager("", "img/bulletHoles.png?v=1", 200, 32, gameScene), bulletHoleManager.fogEnabled = !0, bulletHoleManager.addHole = function (e, i, t, r) {
                var d = new BABYLON.Sprite("", this);
                d.position.x = i, d.position.y = t, d.position.z = r, d.angle = 6.282 * Math.random(), d.cellIndex = e, d.size = .03, 200 == this.sprites.length && this.sprites[0].dispose()
            }, explosionSmokeManager = new BABYLON.SpriteManager("", "img/explosion2.png?v=3", 500, 128, gameScene), explosionSmokeManager.fogEnabled = !0, explosionSmokeManager.noAlphaTest = !0, explosionFireManager = new BABYLON.SpriteManager("", "img/explosion2.png?v=3", 500, 128, gameScene), explosionFireManager.fogEnabled = !0, explosionFireManager.blendMode = BABYLON.Engine.ALPHA_ADD, playOffline) meId = 0, addPlayer({
            id: 0,
            name: "Test",
            charClass: 0,
            team: 0,
            shellColor: 0,
            hatIdx: 0,
            stampIdx: 0,
            totalKills: 0,
            totalDeaths: 0,
            killStreak: 0,
            bestKillStreak: 0,
            x: mapTest.x + .5,
            y: mapTest.y - .32,
            z: mapTest.z + .5,
            dx: 0,
            dy: 0,
            dz: 0,
            frame: 0,
            pitch: mapTest.pitch,
            moveYaw: mapTest.yaw,
            viewYaw: mapTest.yaw,
            shield: 0,
            hp: 0,
            weaponIdx: 0,
            controlKeys: 0
        }), startRendering(), document.getElementById("spawnBox").style.display = "none", camera.position = BABYLON.Vector3.Zero(), camera.rotation = BABYLON.Vector3.Zero(), camera.rotationQuaternion = BABYLON.Quaternion.Zero(), camera.parent = me.actor.eye, camera.lockedTarget = null, players[meId].hp = 100, mapOverview = !1, addCanvasListeners();
        else {
            mapOverview = !0, setUpSocket();
            var e = new Comm.output(1);
            e.packInt8(Comm.clientReady), ws.send(e.buffer), (e = new Comm.output(1)).packInt8(Comm.ping), pingStartTime = Date.now(), ws.send(e.buffer)
        }
    } catch (e) {
        console.log(e)
    }
}

function startRendering() {
    document.getElementById("overlay").style.display = "none", showGameDom(), resize(), captureKeys(), closeAlertDialog(), mapOverview && (camera.position = new BABYLON.Vector3(0, map.height + 2, 0), camera.setTarget(new BABYLON.Vector3(map.width / 2, map.height / 4, map.depth / 2))), gameScene.registerBeforeRender(function () {
        update(), me && (light.position.x = me.x, light.position.y = me.y + 2, light.position.z = me.z)
    }), engine.runRenderLoop(function () {
        gameScene.render()
    })
}

function setUpSocket() {
    ws.onmessage = function (e) {
        for (var i = new Comm.input(e.data); i.isMoreDataAvailable();) switch (i.unPackInt8U()) {
            case Comm.clientReady:
                startRendering(), respawnTime = -1;
                break;
            case Comm.addPlayer:
                var t = {
                    id: i.unPackInt8U(),
                    name: i.unPackString(),
                    charClass: i.unPackInt8U(),
                    team: i.unPackInt8U(),
                    shellColor: i.unPackInt8U(),
                    hatIdx: i.unPackInt8U(),
                    stampIdx: i.unPackInt8U(),
                    x: i.unPackFloat(),
                    y: i.unPackFloat(),
                    z: i.unPackFloat(),
                    dx: i.unPackFloat(),
                    dy: i.unPackFloat(),
                    dz: i.unPackFloat(),
                    viewYaw: i.unPackRadU(),
                    moveYaw: i.unPackRadU(),
                    pitch: i.unPackRad(),
                    totalKills: i.unPackInt32U(),
                    totalDeaths: i.unPackInt32U(),
                    killStreak: i.unPackInt16U(),
                    bestKillStreak: i.unPackInt16U(),
                    shield: i.unPackInt8U(),
                    hp: i.unPackInt8U(),
                    weaponIdx: i.unPackInt8U(),
                    controlKeys: i.unPackInt8U()
                };
                players[t.id] || (meId == t.id || (t.name = t.name.replace(/<|>/g, ""), 0 == t.name.length ? t.name = "Anonymous" : (t.name = fixStringWidth(t.name), isBadWord(t.name) && (t.name = "!@#$"))), addPlayer(t));
                break;
            case Comm.removePlayer:
                removePlayer(s = i.unPackInt8U());
                break;
            case Comm.spawnItem:
                var r = i.unPackInt16U(),
                    d = i.unPackInt8U(),
                    a = i.unPackFloat(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat();
                itemManager.spawnItem(r, d, a, n, o);
                break;
            case Comm.collectItem:
                var s = i.unPackInt8U(),
                    d = i.unPackInt8U(),
                    y = i.unPackInt8U(),
                    r = i.unPackInt16U();
                itemManager.collectItem(d, r), s == meId && me.collectItem(d, y);
                break;
            case Comm.controlKeys:
                var s = i.unPackInt8U(),
                    x = i.unPackInt8U();
                (k = players[s]) && (k.controlKeys = x);
                break;
            case Comm.jump:
                s = i.unPackInt8U();
                (k = players[s]) && players[s].jump();
                break;
            case Comm.die:
                var l = i.unPackInt8U(),
                    z = i.unPackInt8U(),
                    c = i.unPackInt8U(),
                    h = players[l],
                    m = players[z];
                if (h && h.isDead()) {
                    console.log("Comm.die sent for player who is already dead");
                    break
                }
                var u;
                m ? (u = m.name, m.isDead() || (m.totalKills++, m.killStreak++, m.bestKillStreak = Math.max(m.bestKillStreak, m.killStreak), z == meId && (kills++, bestKillStreak = Math.max(bestKillStreak, m.killStreak)))) : u = "N/A";
                var p;
                if (h) {
                    p = h.name;
                    var g = new BABYLON.Vector3(h.x, h.y + .32, h.z);
                    h.actor.deathSound.setPosition(g), h.actor.deathSound.play();
                    var f = Math.randomInt(0, Sounds.death.length);
                    Sounds.death[f].setPosition(g), Sounds.death[f].play(), testing || (h.actor.explodeMesh.setEnabled(!0), h.actor.whiteMesh.setEnabled(!0), h.actor.yolkMesh.setEnabled(!0), beginAnimation(h.actor.explodeMesh, 0, 50, !1, 1), gameScene.beginAnimation(h.actor.whiteMesh, 0, 50, !1, 1), gameScene.beginAnimation(h.actor.yolkMesh, 0, 56, !1, 1), shellFragBurst(h.actor.mesh, 200, 1)), h.die(), h.resetStateBuffer(), h.actor.mesh.position.x = h.x, h.actor.mesh.position.y = h.y, h.actor.mesh.position.z = h.z
                } else p = "N/A";
                if (l != meId) {
                    if (z == meId) {
                        var v = document.getElementById("KILL_BOX");
                        v.style.display = "block", document.getElementById("KILLED_NAME").innerText = p;
                        var w = document.getElementById("KILL_STREAK");
                        me.killStreak > 1 ? w.innerText = me.killStreak + "-KILL STREAK" : w.innerText = "";
                        var S = 1.5,
                            B = interval.set(function () {
                                v.style.transform = "scale(" + S + "," + S + ")", (S -= .05) <= 1 && (S = 1, interval.clear(B))
                            }, 33);
                        killDisplayTimeout = timeout.set(function () {
                            inGame && (v.style.display = "none")
                        }, 4e3)
                    }
                } else {
                    deaths++, camera.parent = null, camera.position = new BABYLON.Vector3(me.actor.mesh.position.x, me.actor.mesh.position.y + .2, me.actor.mesh.position.z), m && (camera.lockedTarget = m.actor.bodyMesh), respawnTime = c, isTimeToPlayVideoAd() && (queueVideoAd = !0, respawnTime = 2), removeCanvasListeners(), document.getElementById("KILLED_BY_NAME").innerText = u, document.getElementById("gameCustomizeButton").style.display = "none", document.getElementById("respawnButton").style.display = "none";
                    var b = document.getElementById("deathBox");
                    b.style.display = "block", console.log("Comm.die displays deathBox, hides respawnButton, and hides gameCustomizeButton");
                    var S = 2,
                        B = interval.set(function () {
                            b.style.transform = "scale(" + S + "," + S + ")", (S -= .05) <= 1 && inGame && (interval.clear(B), document.getElementById("gameCustomizeButton").style.display = "block", console.log("deathBox Interval displays gameCustomizeButton - scale:" + S + " inGame:" + inGame), S = 1)
                        }, 33),
                        M = document.getElementById("respawnMessage");
                    M.innerText = "";
                    var I = interval.set(function () {
                        M.innerText = "You may respawn in " + respawnTime, --respawnTime < 0 && inGame && (interval.clear(I), M.innerText = "", document.getElementById("respawnButton").style.display = "block", console.log("Comm.die displays respawnButton after timer ends"))
                    }, 1e3);
                    timeout.set(function () {
                        inGame && document.exitPointerLock()
                    }, 2e3), timeout.set(function () {
                        inGame && me.isDead() && !queueVideoAd && (document.getElementById("aipGameContainer").style.display = "block", aiptag.cmd.display.push(function () {
                            aipDisplayTag.refresh("shellshock-io_300x250")
                        }))
                    }, 3e3)
                }
                m && h && addKillText(m, h), rebuildPlayerList(), updateBestStreakUi();
                break;
            case Comm.chat:
                var s = i.unPackInt8U(),
                    C = i.unPackString(),
                    k = players[s];
                chatParser.innerHTML = C, C = chatParser.textContent.trim(), k && C.length > 0 && !isBadWord(C) && C.indexOf("<") < 0 && addChat(C, k);
                break;
            case Comm.sync:
                var r = i.unPackInt8U(),
                    A = i.unPackInt8U(),
                    a = i.unPackFloat(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    E = i.unPackRadU(),
                    P = i.unPackRad(),
                    N = i.unPackInt8U();
                if (!(k = players[r])) break;
                if (r == meId) {
                    for (var L = A, O = 1e6, T = A; T != me.stateIdx;) {
                        var Y = me.previousStates[T],
                            R = Math.sqrt(Math.pow(a - Y.x, 2) + Math.pow(n - Y.y, 2) + Math.pow(o - Y.z, 2));
                        R < O && (L = T, O = R), T = (T + 1) % stateBufferSize
                    }
                    var T = L,
                        G = k.previousStates[T],
                        D = k.x,
                        F = k.y,
                        U = k.z;
                    k.x = a, k.y = n, k.z = o, k.dx = G.dx, k.dy = G.dy, k.dz = G.dz, k.climbing = G.climbing, k.jumping = G.jumping;
                    for (var W = me.controlKeys; T != k.stateIdx; T = Math.mod(T + 1, stateBufferSize)) G = k.previousStates[T], k.controlKeys = G.controlKeys, k.moveYaw = G.moveYaw, G.jump && k.jump(), k.update(G.delta, !0), k.previousStates[T].x = k.x, k.previousStates[T].y = k.y, k.previousStates[T].z = k.z, k.previousStates[T].dx = k.dx, k.previousStates[T].dy = k.dy, k.previousStates[T].dz = k.dz;
                    var V = Math.length3(k.x - D, k.y - F, k.z - U);
                    if (V < .01) k.x = D, k.y = F, k.z = U;
                    else if (V < .5) {
                        var K = Math.length2(k.dx, k.dz),
                            j = Math.max(4 - 64 * K, 1);
                        k.x = D + (k.x - D) / j, k.z = U + (k.z - U) / j
                    }
                    k.controlKeys = W
                } else k.x = a, k.y = n, k.z = o, k.viewYaw = E, k.moveYaw = E, k.pitch = P, k.climbing = N;
                break;
            case Comm.fireBullet:
                var r = i.unPackInt8U(),
                    a = i.unPackFloat(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    H = i.unPackFloat(),
                    q = i.unPackFloat(),
                    _ = i.unPackFloat();
                if (!(k = players[r])) break;
                r != meId && (k.actor.head.rotation.x = k.pitch, k.actor.mesh.rotation.y = k.viewYaw, k.weapon.actor.fire()), munitionsManager.fireBullet(k, {
                    x: a,
                    y: n,
                    z: o
                }, {
                    x: H,
                    y: q,
                    z: _
                }, k.weapon.subClass.damage, k.weapon.subClass.ttl, k.weapon.subClass.velocity);
                break;
            case Comm.fireShot:
                var r = i.unPackInt8U(),
                    a = i.unPackFloat(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    H = i.unPackFloat(),
                    q = i.unPackFloat(),
                    _ = i.unPackFloat(),
                    Q = i.unPackInt8U();
                if (!(k = players[r])) break;
                r != meId && (k.actor.head.rotation.x = k.pitch, k.actor.mesh.rotation.y = k.viewYaw, k.weapon.actor.fire()), Math.seed = Q;
                for (T = 0; T < 20; T++) {
                    var Z = Math.normalize3({
                        x: H + Math.seededRandom(-.15, .15),
                        y: q + Math.seededRandom(-.1, .1),
                        z: _ + Math.seededRandom(-.15, .15)
                    });
                    munitionsManager.fireBullet(k, {
                        x: a,
                        y: n,
                        z: o
                    }, Z, k.weapon.subClass.damage, k.weapon.subClass.ttl, k.weapon.subClass.velocity * Math.seededRandom(.9, 1.1))
                }
                break;
            case Comm.throwGrenade:
                var r = i.unPackInt8U(),
                    a = i.unPackFloat(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    X = i.unPackFloat(),
                    J = i.unPackFloat(),
                    $ = i.unPackFloat();
                if (!(k = players[r])) break;
                k.grenadeCount--, r != meId ? (k.actor.head.rotation.x = k.pitch, k.actor.mesh.rotation.y = k.viewYaw) : updateAmmoUi(), k.actor.throwGrenade(), munitionsManager.throwGrenade(k, {
                    x: a,
                    y: n,
                    z: o
                }, {
                    x: X,
                    y: J,
                    z: $
                });
                break;
            case Comm.reload:
                r = i.unPackInt8U();
                players[r] && players[r].reload();
                break;
            case Comm.swapWeapon:
                var r = i.unPackInt8U(),
                    ee = i.unPackInt8U();
                players[r] && players[r].swapWeapon(ee);
                break;
            case Comm.hitMe:
                var ie = i.unPackInt8U(),
                    X = i.unPackFloat(),
                    $ = i.unPackFloat();
                me.hp = ie, me.actor.hit(), hitIndicator.hit(X, $);
                break;
            case Comm.hitThem:
                var r = i.unPackInt8U(),
                    ie = i.unPackInt8U();
                if (!(k = players[r])) break;
                NaN != ie && void 0 != ie || (console.log("Invisibility bug caught in Comm.hitThem!"), ie = 100), k.hp = ie, k.actor.hit(), ie > 0 && shellFragBurst(k.actor.mesh, 100, 1);
                break;
            case Comm.respawn:
                var r = i.unPackInt8U(),
                    a = i.unPackFloat(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    te = i.unPackInt8U();
                (k = players[r]) && (k.respawn(a, n, o, te), r == meId && (console.log("Comm.respawn received from server for this player"), respawnTime = 1e5, camera.position = BABYLON.Vector3.Zero(), camera.rotation = BABYLON.Vector3.Zero(), camera.rotationQuaternion = BABYLON.Quaternion.Zero(), camera.parent = me.actor.eye, camera.lockedTarget = null, mapOverview = !1));
                break;
            case Comm.changeCharacter:
                var r = i.unPackInt8U(),
                    re = i.unPackInt8U(),
                    de = i.unPackInt8U(),
                    ae = i.unPackInt8U(),
                    ne = i.unPackInt8U(),
                    oe = i.unPackInt8U();
                (k = players[r]) && k.changeCharacter(re, de, ae, ne, oe);
                break;
            case Comm.switchTeam:
                var r = i.unPackInt8U(),
                    se = i.unPackInt8U();
                if (gameType != GameType.teams) break;
                if (k = players[r]) {
                    k.team = se, k.killStreak = 0, r == meId && (myTeam = se);
                    for (T = 0; T < 20; T++)(k = players[T]) && k.actor && k.actor.updateTeam();
                    rebuildPlayerList()
                }
                break;
            case Comm.ping:
                var ye = Date.now() - pingStartTime;
                pingTotal += ye, pingSamples++;
                var xe = document.getElementById("PING");
                xe.style.color = ye < 100 ? "#0f0" : ye < 150 ? "#ff0" : ye < 200 ? "#f90" : "#f00", document.getElementById("PING").innerText = ye + "ms", setTimeout(function () {
                    var e = new Comm.output(1);
                    e.packInt8(Comm.ping), pingStartTime = Date.now(), ws && ws.send(e.buffer)
                }, 1e3);
                break;
            case Comm.notification:
                notify(i.unPackString(), 1e3 * i.unPackInt8U())
        }
    }
}

function shellFragBurst(e, i, t) {
    if (e.isVisible) {
        var r = new BABYLON.ParticleSystem("particles", i, gameScene);
        r.targetStopDuration = .2, r.disposeOnStop = !0, r.particleTexture = new BABYLON.Texture("./img/shellfrag.png", gameScene), r.emitter = e, r.minEmitBox = new BABYLON.Vector3(-.2, .2, -.2), r.maxEmitBox = new BABYLON.Vector3(.2, .4, .2), r.color1 = new BABYLON.Color4(1, 1, 1, 4), r.color2 = new BABYLON.Color4(1, 1, 1, 4), r.colorDead = new BABYLON.Color4(1, 1, 1, 0), r.minSize = .01, r.maxSize = .04, r.minLifeTime = .1, r.maxLifeTime = .3, r.emitRate = i, r.manualEmitCount = i, r.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD, r.gravity = new BABYLON.Vector3(0, -10, 0), r.direction1 = new BABYLON.Vector3(-2, -1, -2), r.direction2 = new BABYLON.Vector3(2, 3, 2), r.minAngularSpeed = 10 * -Math.PI, r.maxAngularSpeed = 10 * Math.PI, r.minEmitPower = 1 * t, r.maxEmitPower = 2 * t, r.updateSpeed = .01, r.start()
    }
}

function createMapCells() {
    var e;
    e = playOffline ? JSON.parse(localStorage.getItem("mapBackup")) : minMaps[mapIdx], (map = {
        width: e.width,
        height: e.height + 1,
        depth: e.depth
    }).data = Array(map.width);
    for (var i = 0; i < map.width; i++) {
        map.data[i] = Array(map.height);
        for (var t = 0; t < map.height; t++) {
            map.data[i][t] = Array(map.depth);
            for (var r = 0; r < map.depth; r++) map.data[i][t][r] = {}
        }
    }(SPS = new BABYLON.SolidParticleSystem("SPS", gameScene, {
        updatable: !1
    })).computeParticleColor = !1, SPS.computeParticleTexture = !1, SPS.computeParticleRotation = !1, Object.keys(e.data).forEach(function (i) {
        var t = e.data[i];
        Object.keys(t).forEach(function (e) {
            if (i == MAP.barrier)
                for (var r = t[e], d = 0; d < r.length; d++) map.data[r[d].x][r[d].y][r[d].z] = {
                    cat: i,
                    dec: e,
                    dir: r[d].dir
                };
            else if (i > 0) {
                var r = t[e],
                    d = 0;
                try {
                    SPS.addShape(MapMeshes[i][e], r.length, {
                        positionFunction: function (t, a, n) {
                            t.position.x = r[d].x + .5, t.position.y = r[d].y, t.position.z = r[d].z + .5, t.rotation.x = .5 * -Math.PI, t.rotation.y = r[d].dir * rotInc, t.alive = !1, map.data[r[d].x][r[d].y][r[d].z] = {
                                cat: i,
                                dec: e,
                                dir: r[d].dir
                            }, d++
                        }
                    })
                } catch (e) {}
            }
        })
    });
    var d = [{
        w: 80,
        h: 120,
        r: 0
    }, {
        w: 40,
        h: 50,
        r: 1.5
    }, {
        w: 30,
        h: 20,
        r: 3
    }];
    SPS.addShape(gameScene.getMeshByName("mountains"), 3, {
        positionFunction: function (e, i, t) {
            e.position.x = map.width / 2, e.position.y = 0, e.position.z = map.depth / 2, e.scaling.x = d[t].w, e.scaling.y = d[t].h, e.scaling.z = d[t].w, e.rotation.y = d[t].r, e.alive = !1
        }
    }), (mapMesh = SPS.buildMesh()).receiveShadows = !0, mapMesh.material = gameScene.getMaterialByName("map"), mapMesh.freezeWorldMatrix()
}

function buildMapMesh() {
    createMapCells();
    var e = new BABYLON.StandardMaterial("water material", gameScene);
    e.diffuseColor = new BABYLON.Color3(.05, .1, .2), e.specularColor = new BABYLON.Color3(0, 0, 0);
    var i = BABYLON.MeshBuilder.CreatePlane("plane", {
        size: 1e3
    }, gameScene);
    i.rotation.x = Math.PI / 2, i.position.y = -1, i.material = e;
    var t = new BABYLON.SkyMaterial("skyMaterial", gameScene);
    t.backFaceCulling = !1;
    var r = BABYLON.Mesh.CreateBox("skyBox", 1e3, gameScene);
    r.material = t, r.position.x = map.width / 2, r.position.z = map.depth / 2, t.fogEnabled = !1, t.useSunPosition = !0, t.sunPosition = new BABYLON.Vector3(-.25, 1, -.5), t.turbidity = 1.5, t.luminance = .5, t.rayleigh = 2
}

function update() {
    var e = Math.floor(60 / SyncRate);
    fps[fpsIdx] = engine.getFps(), fpsSum += fps[fpsIdx], fpsSum -= fps[(fpsIdx + 1) % 60], fpsIdx = (fpsIdx + 1) % 60;
    var i = Math.ceil(fpsSum / 60);
    fpsTotal += i, ++fpsSamples % 10 == 0 && (document.getElementById("FPS").innerHTML = "FPS: " + i, document.getElementById("healthBar").style.width = me.hp + "%");
    var t = performance.now();
    if (pingSamples > 10) {
        var r = t - pingStartTime;
        highestPing = Math.max(highestPing, r)
    }
    for (var d = t - lastTimeStamp; lastTimeStamp < t - .01;) {
        if (lastTimeStamp += 1e3 / 60, pollGamepad(d = 1), freezeFrame) me.update(d), me.actor.update(d);
        else
            for (var a = 0; a < players.length; a++) {
                var n = players[a];
                n && (n.update(d), n.actor && n.actor.update(d))
            }
        me && (me.previousStates[me.stateIdx] = {
            delta: d,
            moveYaw: me.moveYaw,
            fire: !1,
            jump: me.previousStates[me.stateIdx].jump,
            jumping: me.jumping,
            climbing: me.climbing,
            x: me.x,
            y: me.y,
            z: me.z,
            dx: me.dx,
            dy: me.dy,
            dz: me.dz,
            controlKeys: me.controlKeys
        }, me.stateIdx % e == 0 && ws.readyState == ws.OPEN && me.hp > 0 && !freezeFrame && serverSync(), me.stateIdx = Math.mod(me.stateIdx + 1, stateBufferSize), me.previousStates[me.stateIdx].jump = !1, hitIndicator.update(d), reticle.update(d), me.weapon && 0 == me.weapon.ammo.rounds && (me.stateIdx % 20 == 0 ? document.getElementById("AMMO").style.color = "#f00" : me.stateIdx % 20 == 10 && (document.getElementById("AMMO").style.color = "#fff")), 1 == grenadePowerUp && (grenadeThrowPower = Math.min(grenadeThrowPower + .015, 1)) > 0 && (document.getElementById("grenadeThrowContainer").style.visibility = "visible", document.getElementById("grenadeThrow").style.height = 100 * grenadeThrowPower + "%")), freezeFrame || (munitionsManager.update(d), itemManager.update(d), updateExplosions(explosionSmokeManager, d), updateExplosions(explosionFireManager, d)), mapOverview && (mapOverviewAxis += .002 * d, camera.position.x = Math.sin(mapOverviewAxis) * map.height + map.width / 2, camera.position.z = Math.cos(mapOverviewAxis) * map.height + map.depth / 2, camera.setTarget(new BABYLON.Vector3(map.width / 2, map.height / 4, map.depth / 2)))
    }
}

function hitPlayer() {}

function serverSync() {
    if (me) {
        me.moveYaw = me.viewYaw;
        var e = new Comm.output(6);
        e.packInt8(Comm.sync), e.packInt8(me.stateIdx), e.packRadU(me.moveYaw), e.packRad(me.pitch), ws.send(e.buffer)
    }
}

function switchTeamDialog() {
    openAlertDialog("", 1 == me.team ? 'Switch to team<h1 class="redTeam">RED?</h1>Your score will be reset!' : 'Switch to team<h1 class="blueTeam">BLUE?</h1>Your score will be reset!', {
        label: "Yes",
        width: "5em",
        onclick: switchTeam
    }, {
        label: "No",
        width: "5em",
        onclick: closeAlertDialog
    })
}

function switchTeam() {
    document.getElementById("switchTeamButton").style.opacity = .333, document.getElementById("switchTeamButton").style.pointerEvents = "none", me.teamSwitchCooldown = 300, closeAlertDialog();
    var e = new Comm.output(1);
    e.packInt8(Comm.switchTeam), ws.send(e.buffer)
}

function addPlayer(e) {
    var i = new Player(e);
    i.id == meId && ((me = i).ws = ws, updateAmmoUi()), i.isDead() && i.actor.die(), players[e.id] = i, rebuildPlayerList()
}

function removePlayer(e) {
    var i = players[e];
    e != meId ? i && (i.actor.remove(), delete players[e], rebuildPlayerList()) : console.log("Tried to remove ME")
}

function rebuildPlayerList() {
    for (var e = [], i = 0; i < players.length; i++) players[i] && e.push(i);
    if (gameType == GameType.teams) {
        for (var t = [0, 0, 0], i = 0; i < 20; i++)(d = players[i]) && (t[d.team] += d.killStreak);
        t[1] > t[2] ? lastLeadingTeam = 1 : t[2] > t[1] && (lastLeadingTeam = 2), t[lastLeadingTeam] += 1e5, e.sort(function (e, i) {
            return players[i].killStreak + t[players[i].team] - (players[e].killStreak + t[players[e].team])
        })
    } else e.sort(function (e, i) {
        return players[i].killStreak - players[e].killStreak
    });
    var r = document.getElementById("playerList").children;
    for (i = 0; i < e.length; i++) {
        var d = players[e[i]];
        r[i].style.display = "block", r[i].children[0].innerText = d.name, r[i].children[1].innerText = d.killStreak, players[e[i]].id == meId ? (r[i].className = "thisPlayer", r[i].style.background = teamColors.meBackground[d.team]) : (r[i].className = "otherPlayer", r[i].style.background = teamColors.themBackground[d.team], r[i].style.color = teamColors.text[d.team])
    }
    for (; i < 20;) r[i].style.display = "none", i++
}

function updateBestStreakUi() {
    var e = players[meId];
    document.getElementById("BEST_STREAK").innerText = "BEST KILL STREAK: " + e.bestKillStreak
}

function updateAmmoUi() {
    if (me) {
        var e = document.getElementById("WEAPON_NAME");
        e.innerHTML = me.weapon.subClass.weaponName, (e = document.getElementById("AMMO")).style.color = "#fff", e.innerHTML = me.weapon.ammo.rounds + "/" + Math.min(me.weapon.ammo.store, me.weapon.ammo.storeMax);
        for (var i = 1; i <= 3; i++) me.grenadeCount >= i ? document.getElementById("grenade" + i).src = "img/grenadeIcon.png" : document.getElementById("grenade" + i).src = "img/grenadeIconDark.png"
    }
}

function captureKeys() {
    lastKey = null, document.onkeydown = onKeyDown, document.onkeyup = onKeyUp
}

function releaseKeys() {
    document.onkeydown = null, document.onkeyup = null
}

function inputDown(e) {
    !me.isDead() && document.pointerLockElement && handleInputDown(inputToControlMap[e])
}

function handleInputDown(e) {
    switch (e) {
        case "up":
        case "down":
        case "left":
        case "right":
            var i = controlToBitmask[e];
            me.controlKeys |= i, me.previousStates[me.stateIdx].controlKeys = me.controlKeys, (t = new Comm.output(2)).packInt8(Comm.controlKeys), t.packInt8(me.controlKeys), ws.send(t.buffer);
            break;
        case "jump":
            var t = new Comm.output(1);
            t.packInt8(Comm.jump), ws.send(t.buffer), me.jump(), me.previousStates[me.stateIdx].jump = !0, me.previousStates[me.stateIdx].jumping = me.jumping, me.previousStates[me.stateIdx].dy = me.dy;
            break;
        case "fire":
            document.pointerLockElement && me && me.pullTrigger();
            break;
        case "grenade":
            document.pointerLockElement && me && !grenadePowerUp && me.canSwapOrReload() && me.grenadeCount > 0 && (grenadePowerUp = !0, grenadeThrowPower = -.15);
            break;
        case "scope":
            settings.holdToAim ? me.actor.scopeIn() : me.actor.scope ? me.actor.scopeOut() : me.actor.scopeIn();
            break;
        case "reload":
            me.reload();
            break;
        case "weapon":
            me.swapWeapon(0 == me.weaponIdx ? 1 : 0)
    }
}

function inputUp(e) {
    !me.isDead() && document.pointerLockElement && handleInputUp(inputToControlMap[e])
}

function handleInputUp(e) {
    switch (e) {
        case "fire":
            me.weapon && (me.triggerPulled = !1);
            break;
        case "scope":
            settings.holdToAim && me.actor.scopeOut();
            break;
        case "grenade":
            document.pointerLockElement && me && grenadePowerUp && (document.getElementById("grenadeThrowContainer").style.visibility = "hidden", grenadePowerUp = !1, me.throwGrenade(grenadeThrowPower));
            break;
        case "up":
        case "down":
        case "left":
        case "right":
            var i = controlToBitmask[e];
            me.controlKeys ^= i, me.previousStates[me.stateIdx].controlKeys |= i;
            var t = new Comm.output(2);
            t.packInt8(Comm.controlKeys), t.packInt8(me.controlKeys), ws.send(t.buffer)
    }
}

function debugDump() {
    if (debugWindow) {
        for (var e = 0; e < 20; e++) {
            var i = players[e];
            if (i) {
                var t = "",
                    r = {};
                for (var d in i) r[d] = i[d];
                var a = {
                    x: r.actor.mesh.position.x,
                    y: r.actor.mesh.position.y,
                    z: r.actor.mesh.position.z,
                    shellEnabled: r.actor.bodyMesh.isEnabled(),
                    shellVisible: r.actor.bodyMesh.isVisible
                };
                delete r.weapon, delete r.weapons, delete r.actor, delete r.previousStates, delete r.ws, t += "\n\nPlayer: " + objToStr(r), t += "\n\nActor: " + objToStr(a);
                for (var d in i.weapons) {
                    var n = {};
                    for (var o in i.weapons[d]) n[o] = i.weapons[d][o];
                    delete n.player, delete n.actor, t += "\n\nWeapon: " + objToStr(n)
                }
                debugWindow.document.write(t)
            }
        }
        debugWindow.document.write("<hr>")
    } else(debugWindow = window.open("", "", "name=Debug")).document.write("<pre>")
}

function addKillText(e, i) {
    var t = [" SCRAMBLED ", " BEAT ", " POACHED ", " WHIPPED ", " FRIED ", " CRACKED "],
        r = '<span style="color: ' + teamColors.text[e.team] + '">' + e.name + "</span>" + t[Math.randomInt(0, t.length)] + '<span style="color: ' + teamColors.text[i.team] + '">' + i.name + "</span>";
    (killEl.innerHTML.match(/<br>/g) || []).length > 4 && (killEl.innerHTML = killEl.innerHTML.substr(killEl.innerHTML.search("<br>") + 4)), killEl.innerHTML += r + "<br>"
}

function initChatIn() {
    canvas.focus(), chatInEl.style.display = "block", chatInEl.value = "Press ENTER to chat", chatInEl.style.background = "transparent", chatInEl.blur(), chatting = !1
}

function addChat(e, i) {
    i && (e = '<span style="color: ' + teamColors.text[i.team] + '">' + i.name + ": </span>" + e), (chatOutEl.innerHTML.match(/<br>/g) || []).length > 4 && (chatOutEl.innerHTML = chatOutEl.innerHTML.substr(chatOutEl.innerHTML.search("<br>") + 4)), chatOutEl.innerHTML += e + "<br>"
}

function onChatKeyDown(e) {
    var i = (e = e || window.event).key;
    switch (chatInEl.value = fixStringWidth(chatInEl.value, 280), i) {
        case "Enter":
            var t = chatInEl.value.trim();
            if ("" != t && t.indexOf("<") < 0) {
                var r = new Comm.output(2 + 2 * t.length);
                r.packInt8(Comm.chat), r.packString(t), ws.send(r.buffer), addChat(t, me), me.chatLineCap--
            }
            case "Tab":
                initChatIn(), e.preventDefault(), e.stopPropagation(), captureKeys()
    }
}

function onKeyDown(e) {
    var i = (e = e || window.event).key;
    if (i != lastKey)
        if (lastKey = i, grenadePowerUp || 0 != me.controlKeys || "Enter" != i || !settings.enableChat) {
            var t = ("" + i).toLocaleUpperCase();
            if ("" != inputTally && "" == (inputTally = inputTally.replace(t, "")) && (document.getElementById("help").style.display = "none", localStorage.setItem("hideHelp", 1)), " " == t && (t = "SPACE", e.preventDefault()), debug) {
                if ("`" == t) return void debugDump();
                if ("\\" == t) {
                    freezeFrame = !0;
                    for (r = 0; r < gameScene.particleSystems.length; r++) gameScene.particlesPaused = !0;
                    for (var r = 0; r < 20; r++) players[r] && players[r].actor && (players[r].actor.mesh.setVisible(!0), players[r].actor.showNameSprite(), players[r].actor.positionNameSprite());
                    ws.close()
                }
            }
            inputDown(t)
        } else me.chatLineCap > 0 && (releaseKeys(), chatInEl.style.background = "rgba(0, 0, 0, 0.5)", chatInEl.value = "", chatInEl.focus(), lastKey = null, chatting = !0)
}

function onKeyUp(e) {
    var i = (e = e || window.event).key;
    i == lastKey && (lastKey = null);
    var t = ("" + i).toLocaleUpperCase();
    " " == t && (t = "SPACE", e.preventDefault()), inputUp(t)
}

function Scope() {
    this.crosshairs = new BABYLON.AbstractMesh("", gameScene), this.crosshairs.setEnabled(!1), this.crosshairs.position.z = 2;
    var e = [new BABYLON.Vector3(-1, 0, 0), new BABYLON.Vector3(1, 0, 0)],
        i = BABYLON.MeshBuilder.CreateLines("", {
            points: e
        }, gameScene);
    i.layerMask = 536870912, i.color = BABYLON.Color3.Black(), i.parent = this.crosshairs, e = [new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(0, 1, 0)], (i = BABYLON.MeshBuilder.CreateLines("", {
        points: e
    }, gameScene)).layerMask = 536870912, i.color = BABYLON.Color3.Black(), i.parent = this.crosshairs
}

function HitIndicator() {
    this.mesh = new BABYLON.Mesh("hitIndicator", gameScene), this.mesh.updatable = !0, this.mesh.hasVertexAlpha = !0, this.positions = [0, 0, 0, 0, .5, 0, .5, .5, 0, .5, 0, 0, .5, -.5, 0, 0, -.5, 0, -.5, -.5, 0, -.5, 0, 0, -.5, .5, 0];
    var e = [0, 1, 8, 0, 2, 1, 0, 2, 1, 0, 3, 2, 0, 3, 2, 0, 4, 3, 0, 4, 3, 0, 5, 4, 0, 5, 4, 0, 6, 5, 0, 6, 5, 0, 7, 6, 0, 7, 6, 0, 8, 7, 0, 8, 7, 0, 1, 8];
    this.colors = new Array(48).fill(0);
    for (var i = 0; i < 48; i += 4) this.colors[i] = 1, this.colors[i + 1] = .9, this.colors[i + 2] = 0, this.colors[i + 3] = -.5;
    var t = new BABYLON.VertexData;
    t.positions = this.positions, t.indices = e, t.colors = this.colors, t.applyToMesh(this.mesh, !0), this.mesh.layerMask = 536870912, this.mesh.material = gameScene.getMaterialByName("ui"), this.resize()
}

function Reticle() {
    this.mesh = new BABYLON.AbstractMesh("reticle", gameScene), this.mesh.position.z = 1, this.lines = [];
    var e = gameScene.getMeshByName("reticle");
    e.setMaterial(gameScene.getMaterialByName("ui"));
    for (var i = 0; i < 4; i++) {
        var t = e.createInstance("", this.mesh);
        t.parent = this.mesh, t.scaling = new BABYLON.Vector3(1, 1, 1), t.rotation.z = i * Math.PI / 2, this.lines.push(t)
    }
    this.mesh.setLayerMask(536870912), this.resize()
}

function inviteFriends() {
    var e = selectedServer.toString(36) + uniqueId.toString(36) + uniqueKey.toString(36);
    document.getElementById("friendCode").innerText = "https://shellshock.io/#" + e, document.getElementById("inviteFriends").style.display = "block"
}

function copyFriendCode() {
    document.getElementById("friendCode").select();
    try {
        document.execCommand("copy")
    } catch (e) {
        console.log("Unable to copy to clipboard")
    }
}

function isMeshVisible(e, i) {
    if (freezeFrame) return !0;
    for (var t = i || e.getBoundingInfo().boundingBox.center.z, r = e.position.x - camera.globalPosition.x, d = e.position.y + t - camera.globalPosition.y, a = e.position.z - camera.globalPosition.z, n = Math.length3(r, d, a), o = Math.normalize3({
            x: r,
            y: d,
            z: a
        }, .9), s = camera.globalPosition.x, y = camera.globalPosition.y, x = camera.globalPosition.z, l = 0, z = 0; z < n - .9; z += .9) {
        var c = collidesWithCell(s += o.x, y += o.y, x += o.z);
        if (c && (c.cel.cat == MAP.ground || c.cel.cat == MAP.block) && 2 == ++l) return !1
    }
    return !0
}

function isTimeToPlayVideoAd() {
    var e = getStoredNumber("lastPreRoll", Date.now()),
        i = 42e4;
    return playwireTest && (i = 6e4), timesPlayed > 1 && deaths > 1 && Date.now() > e + i
}

function openCustomizerInGame() {
    hideGameDom(), engine.stopRenderLoop(), scene = customizer.scene, customizer.open(), customizer.startRendering()
}

function resetGameUI() {
    chatOutEl.innerHTML = "", 1 == settings.enableChat && (initChatIn(), chatOutEl.style.display = "block", chatInEl.style.display = "block"), killEl.innerHTML = "", chatOutEl.value = "", document.getElementById("BEST_STREAK").innerText = "BEST KILL STREAK: 0", document.getElementById("KILL_BOX").style.display = "none", document.getElementById("deathBox").style.display = "none", document.getElementById("gameCustomizeButton").style.display = "none", document.getElementById("scopeBorder").style.display = "none", document.getElementById("respawnButton").style.display = "none", document.getElementById("spawnBox").style.display = "block", document.getElementById("aipGameContainer").style.display = "none", console.log("resetGameUI hides deathBox, respawnButton, and gameCustomizeButton")
}

function spectatePlayer(e) {
    camera.position = BABYLON.Vector3.Zero(), camera.rotation = BABYLON.Vector3.Zero(), camera.rotationQuaternion = BABYLON.Quaternion.Zero(), camera.parent = e.actor.eye, camera.lockedTarget = null
}

function addCanvasListeners() {
    console.log("Event listeners added"), canvas.style.pointerEvents = "all", canvas.addEventListener("mousedown", onCanvasMouseDown, !1), canvas.addEventListener("mouseup", onCanvasMouseUp, !1), canvas.addEventListener("click", onCanvasClick, !1), canvas.addEventListener("mousemove", onCanvasMouseMove)
}

function removeCanvasListeners() {
    console.log("Event listeners removed"), canvas.style.pointerEvents = "none", canvas.removeEventListener("click", onCanvasClick), canvas.removeEventListener("mousedown", onCanvasMouseDown), canvas.removeEventListener("mouseup", onCanvasMouseUp), canvas.removeEventListener("mousemove", onCanvasMouseMove)
}

function Customizer(e) {
    this.camX = 0, this.camY = .4, this.camRadius = 3.4, this.rotY = 0, this.rotX = 0, this.jump = 0, this.turnCountdown = 60, this.selectedItem = 0, selectedColor = getStoredNumber("selectedColor", 0), document.getElementById("color" + selectedColor).style.borderWidth = "0.2em";
    for (var i = 0; i < shellColors.length; i++) document.getElementById("color" + i).style.background = shellColors[i];
    this.scene = new BABYLON.Scene(engine), this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2, this.scene.fogDensity = .06;
    var t = new BABYLON.Color3(.52, .68, .82);
    this.scene.fogColor = t, this.scene.clearColor = t;
    var r = new BABYLON.DirectionalLight("", new BABYLON.Vector3(0, -1, 0), this.scene);
    r.intensity = 1;
    var d = new BABYLON.HemisphericLight("", new BABYLON.Vector3(.25, 1, -.5), this.scene);
    d.intensity = .8, (d = new BABYLON.HemisphericLight("", new BABYLON.Vector3(0, -1, 0), this.scene)).intensity = .5, d.diffuse = new BABYLON.Color3(.6, .8, 1), (shadowGen = new BABYLON.ShadowGenerator(1024, r)).useBlurExponentialShadowMap = !0, shadowGen.frustumEdgeFalloff = 1, shadowGen.blurScale = 2, shadowGen.blurBoxOffset = 1, this.camera = new BABYLON.ArcRotateCamera("", .5 * Math.PI, 1.5, this.camRadius, new BABYLON.Vector3(this.camX, this.camY, 0), this.scene), this.scene.activeCameras.push(this.camera), this.camera.maxZ = 100, this.camera.fov = .5, this.camera.minZ = .1;
    var a = new BABYLON.StandardMaterial("groundMat", this.scene);
    a.diffuseColor = new BABYLON.Color3(.4, .5, .6), a.specularColor = BABYLON.Color3.Black();
    var n = BABYLON.Mesh.CreatePlane("ground", 100, this.scene);
    n.rotation.x = Math.PI / 2, n.receiveShadows = !0, n.material = a, this.scene.render();
    for (var o = 0; o < Weapons.length; o++)
        for (var s = 0; s < Weapons[o].length; s++)
            for (var y = 0; y < Weapons[o][s].length; y++) {
                var x = Weapons[o][s][y].class;
                for (var l in weaponStats) "range" == l && (x.range = x.ttl * x.velocity), weaponStats[l].flip ? (weaponStats[l].max = Math.max(weaponStats[l].max, -x[l]), weaponStats[l].min = Math.min(weaponStats[l].min, -x[l])) : (weaponStats[l].max = Math.max(weaponStats[l].max, x[l]), weaponStats[l].min = 0)
            }
    stampTexture = new BABYLON.Texture("img/stamps.png?v=1", this.scene), this.weaponCam = [{
        alpha: 0,
        radius: 1.1,
        primaryGun: !0
    }, {
        alpha: 0,
        radius: .8
    }], this.secondaryCam = {
        alpha: 0,
        radius: .8
    }, this.hatCam = {
        alpha: 1,
        beta: .4 * Math.PI,
        radius: 1.3,
        y: .05
    };
    var z = this;
    loadResources(z.scene, function () {
        z.onResourcesLoaded(), e()
    })
}

function GrenadeActor(e) {
    this.grenade = e, this.mesh = scene.cloneMesh("grenade"), this.mesh.setEnabled(!1), this.explodeSound = Sounds.grenade.explode.clone(), this.pinSound = this.mesh.attachSound(Sounds.grenade.pin), this.beepSound = this.mesh.attachSound(Sounds.grenade.beep), this.beep = !1, this.flashColor = null
}

function GunActor(e) {
    this.gun = e, this.name = e.subClass.meshName, this.playerActor = e.player.actor
}

function Eggk47Actor(e) {
    GunActor.call(this, e), this.scopeFov = .9, this.scopeY = .036, this.setup(.6), this.fireSound = this.gunMesh.attachSound(Sounds.eggk47.fire), this.dryFireSound = this.gunMesh.attachSound(Sounds.eggk47.dryFire);
    var i = this.gunMesh.attachSound(Sounds.eggk47.removeMag),
        t = this.gunMesh.attachSound(Sounds.eggk47.insertMag),
        r = this.gunMesh.attachSound(Sounds.eggk47.cycle);
    this.addSoundEvent("shortReload", 30, i), this.addSoundEvent("shortReload", 107, t), this.addSoundEvent("longReload", 30, i), this.addSoundEvent("longReload", 107, t), this.addSoundEvent("longReload", 155, r)
}

function DozenGaugeActor(e) {
    GunActor.call(this, e), this.scopeFov = 1, this.scopeY = .072, this.setup(.6), this.fireSound = this.gunMesh.attachSound(Sounds.dozenGauge.fire), this.dryFireSound = this.gunMesh.attachSound(Sounds.eggk47.dryFire);
    var i = this.gunMesh.attachSound(Sounds.dozenGauge.open),
        t = this.gunMesh.attachSound(Sounds.dozenGauge.load),
        r = this.gunMesh.attachSound(Sounds.dozenGauge.close);
    this.addSoundEvent("reload", 0, i), this.addSoundEvent("reload", 86, t), this.addSoundEvent("reload", 110, r)
}

function CSG1Actor(e) {
    GunActor.call(this, e), this.scopeFov = .5, this.scopeY = .0345, this.setup(.6), this.fireSound = this.gunMesh.attachSound(Sounds.csg1.fire), this.dryFireSound = this.gunMesh.attachSound(Sounds.eggk47.dryFire);
    var i = this.gunMesh.attachSound(Sounds.eggk47.removeMag),
        t = this.gunMesh.attachSound(Sounds.eggk47.insertMag),
        r = this.gunMesh.attachSound(Sounds.csg1.pullAction),
        d = this.gunMesh.attachSound(Sounds.csg1.releaseAction);
    this.addSoundEvent("shortReload", 30, i), this.addSoundEvent("shortReload", 98, t), this.addSoundEvent("longReload", 20, r), this.addSoundEvent("longReload", 50, i), this.addSoundEvent("longReload", 118, t), this.addSoundEvent("longReload", 145, d)
}

function Cluck9mmActor(e) {
    GunActor.call(this, e), this.scopeFov = 1.1, this.scopeY = .072, this.setup(.482), this.fireSound = this.gunMesh.attachSound(Sounds.cluck9mm.fire), this.dryFireSound = this.gunMesh.attachSound(Sounds.eggk47.dryFire);
    var i = this.gunMesh.attachSound(Sounds.cluck9mm.removeMag),
        t = this.gunMesh.attachSound(Sounds.cluck9mm.insertMag),
        r = this.gunMesh.attachSound(Sounds.eggk47.cycle);
    this.addSoundEvent("shortReload", 5, i), this.addSoundEvent("shortReload", 50, t), this.addSoundEvent("longReload", 5, i), this.addSoundEvent("longReload", 50, t), this.addSoundEvent("longReload", 99, r)
}

function ItemActor(e) {
    this.kind = e
}

function AmmoActor() {
    ItemActor.call(this, ItemManager.AMMO), this.mesh = scene.getMeshByName("ammo").createInstance(""), this.mesh.setEnabled(!1), shadowGen && shadowGen.getShadowMap().renderList.push(this.mesh)
}

function GrenadeItemActor() {
    ItemActor.call(this, ItemManager.GRENADE), this.mesh = scene.getMeshByName("grenadeItem").createInstance(""), this.mesh.setEnabled(!1), shadowGen && shadowGen.getShadowMap().renderList.push(this.mesh)
}

function ItemManager() {
    this.pools = [new Pool(function () {
        return new ItemManager.Constructors[ItemManager.AMMO]
    }, 100), new Pool(function () {
        return new ItemManager.Constructors[ItemManager.GRENADE]
    }, 20)]
}

function ItemRenderer() {
    this.canvas = document.createElement("canvas"), this.canvas.width = 256, this.canvas.height = 256, this.canvas.style.position = "fixed", this.canvas.style.top = "-100em", this.canvas.style.left = "1em", document.body.appendChild(this.canvas), this.engine = new BABYLON.Engine(this.canvas, !0, null, !1), this.scene = new BABYLON.Scene(this.engine), this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0), this.meshes = {
        Skeletons: {}
    }, loadMaterials(this.scene), loadMeshes(this.scene, ["egg"], null, function () {}), this.stampSprites = new BABYLON.SpriteManager("", "img/stamps.png?v=1", 256, 128, this.scene), this.camera = new BABYLON.ArcRotateCamera("", 0, 0, 0, new BABYLON.Vector3(0, 0, 0), this.scene), this.scene.activeCameras.push(this.camera), this.camera.fov = .5, this.camera.maxZ = 100, this.camera.minZ = .1
}

function getKeyByValue(e, i) {
    for (var t in e)
        if (e.hasOwnProperty(t) && e[t] === i) return t
}

function openServerList() {
    openAlertDialog("Servers", "", {
        label: "Close",
        width: "6em",
        onclick: closeServerList
    });
    for (var e = document.getElementById("serverItem"), i = document.createElement("form"), t = ["lime", "yellow", "orange", "red"], r = 0; r < servers.length; r++) {
        var d = e.cloneNode(!0);
        d.style.display = "block";
        var a = d.children[0].children[0],
            n = d.children[0].children[1],
            o = (d.children[0].children[2], d.children[0].children[3]),
            s = d.children[0].children[4],
            y = d.children[0].children[5];
        n.innerText = servers[r].name, a.value = r;
        var x, l;
        servers[r].ping ? (x = Math.min(5.4, Math.max(0, (servers[r].ping - 50) / 65)) + .1, l = Math.min(3, Math.floor(servers[r].ping / 100)), o.style.display = "block", s.style.display = "none", o.style.backgroundColor = t[l], o.style.borderRight = x + "em solid var(--egg-brown)", y.innerText = servers[r].ping + "ms") : (o.style.display = "none", s.style.display = "block"), i.appendChild(d)
    }
    document.getElementById("alertMessage").appendChild(i), i.children[selectedServer].children[0].children[0].checked = !0, i.addEventListener("change", function (e) {
        selectServer(e.target.value)
    })
}

function closeServerList() {
    closeAlertDialog()
}

function pingServers(e, i) {
    function t(e) {
        for (var i = 0, t = 0; t < servers.length; t++) {
            var r = servers[t];
            r.pinger = new WebSocket("wss://" + servers[t].address), r.pinger.binaryType = "arraybuffer", r.pinger.idx = t, r.pinger.onopen = function (e) {
                var i = new Comm.output(1);
                i.packInt8(Comm.ping), this.send(i.buffer), this.pingStartTime = Date.now()
            }, r.pinger.onmessage = function (t) {
                new Comm.input(t.data);
                var r = Date.now() - this.pingStartTime;
                null != servers[this.idx].ping && (servers[this.idx].ping += r), this.close(), ++i == servers.length && e()
            }, r.pinger.onerror = function (t) {
                servers[this.idx].ping = null, ++i == servers.length && e()
            }
        }
    }

    function r() {
        t(function () {
            if (4 == ++a) {
                for (var t = 1e7, d = 0; d < servers.length; d++) null != servers[d].ping && servers[d].ping < t && (e && selectServer(d), t = servers[d].ping), servers[d].ping = Math.floor(servers[d].ping / 4);
                i && i()
            } else r()
        })
    }
    for (var d = 0; d < servers.length; d++) servers[d].ping = 0;
    var a = 0;
    r()
}

function selectServer(e) {
    selectedServer = e, localStorage.setItem("selectedServer", e), document.getElementById("serverName").innerText = "Server: " + servers[selectedServer].name
}

function selectGameType(e) {
    gameType = e, localStorage.setItem("gameType", e)
}

function resize() {
    canvas && (canvas.style.width = "100%", canvas.style.height = "100%", canvas.className = "");
    var e;
    if (inGame) {
        document.getElementById("aipGameContainer");
        e = Math.min(1, window.innerHeight / 725)
    } else {
        document.getElementById("aipMenuContainer");
        e = Math.min(1, window.innerHeight / 725)
    }
    var i = document.getElementById("shellshock-io_300x250");
    i.style.transform = "scale(" + e + ")", i.style.width = 300 * e + "px", i.style.height = 250 * e + "px", engine && engine.resize(), hitIndicator && hitIndicator.resize(), reticle && reticle.resize()
}

function setGameTypeList(e) {
    for (var i = document.getElementById("gameTypeSelect"), t = e ? "longName" : "shortName", r = 0; r < GameTypes.length; r++) {
        var d = GameTypes[r];
        i.options[r].text = d[t]
    }
}

function loggedIn(e) {
    if (!gameSession && (dbId = e.uid, gameSession = null, e.getIdToken(!0).then(function (e) {
            var i = document.getElementById("statsMessage");
            i.innerHTML = "Retrieving your stats...", i.style.display = "block";
            var t = new WebSocket(servicesServer);
            t.onopen = function (i) {
                t.send(JSON.stringify({
                    cmd: "auth",
                    token: e
                })), console.log("authWs opened, and auth request sent")
            }, t.onmessage = function (e) {
                (dbStats = JSON.parse(e.data)).error ? (i.innerHTML = "Database error. Please reload the page. If that doesn't work, send us a bug report!", console.log("dbStats Error: " + JSON.stringify(dbStats.error))) : (updatePlayerStatsDisplay(), i.style.display = "none", document.getElementById("playerStats").style.display = "flex", gameSession = dbStats.session), t.close()
            }, t.onclose = function (e) {
                console.log("authWs closed: " + e.code + " " + e.reason)
            }, t.onerror = function (e) {
                i.innerHTML = "Database error. Please reload the page. If that doesn't work, send us a bug report!", console.log("authWS Error: " + JSON.stringify(e, ["message", "arguments", "type", "name"]))
            }
        }).catch(function (e) {
            console.log(e)
        }), document.getElementById("login").style.display = "none", document.getElementById("logout").style.display = "block", e.photoURL)) {
        var i = e.photoURL,
            t = e.providerData[0];
        "facebook.com" == t.providerId && (i = "https://graph.facebook.com/" + t.uid + "/picture"), document.getElementById("profilePic").src = i, document.getElementById("profilePic").style.display = "block"
    }
}

function logout() {
    firebase.auth().signOut().then(function () {
        document.getElementById("login").style.display = "block", document.getElementById("logout").style.display = "none", document.getElementById("profilePic").style.display = "none", document.getElementById("playerStats").style.display = "none", document.getElementById("statsMessage").style.dispaly = "none", dbId = null, gameSession = null, user = null, customizer.selectColor(0), customizer.selectStamp(0), customizer.selectHat(0)
    }, function (e) {
        console.log(e)
    })
}

function openLoginDialog() {
    openAlertDialog("", '<div id="firebaseui-auth-container"></div>', {
        label: "Cancel",
        width: "6em",
        onclick: closeAlertDialog
    }), firebaseUi || (firebaseUi = new firebaseui.auth.AuthUI(firebase.auth()));
    var e = {
        callbacks: {
            signInSuccessWithAuthResult: function (e, i) {
                var t = e.user,
                    r = t.emailVerified,
                    d = (e.credential, e.additionalUserInfo.isNewUser),
                    a = e.additionalUserInfo.providerId;
                e.operationType;
                return closeAlertDialog(), r || "password" != a ? loggedIn(t) : d ? (t.sendEmailVerification(), openAlertDialog("Check Your Email", "An email has been sent to:<br><h3>" + t.email + "</h3>Click on the enclosed link to complete your registration.", {
                    label: "OK",
                    width: "6em",
                    onclick: closeAlertDialog
                })) : openAlertDialog("Check Your Email", "An email was sent to:<br><h3>" + t.email + '</h3>Click on the enclosed link to complete your registration,<br>or click "Resend" to send a new email.', {
                    label: "OK",
                    width: "6em",
                    onclick: closeAlertDialog
                }, {
                    label: "Resend",
                    width: "6em",
                    onclick: function () {
                        t.sendEmailVerification(), closeAlertDialog()
                    }
                }), !1
            },
            uiShown: function (e) {}
        },
        credentialHelper: firebaseui.auth.CredentialHelper.NONE,
        signInFlow: "popup",
        signInOptions: [{
            provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
            requireDisplayName: !1
        }, firebase.auth.FacebookAuthProvider.PROVIDER_ID, firebase.auth.GoogleAuthProvider.PROVIDER_ID],
        tosUrl: "https://shellshock.io/eula.html"
    };
    firebaseUi.start("#firebaseui-auth-container", e)
}

function onResourcesLoaded() {
    document.getElementById("mainMenu").style.display = "block", document.getElementById("username").disabled = !1, resize(), closeAlertDialog();
    getStoredString("lastVersionPlayed", version);
    localStorage.setItem("lastVersionPlayed", version), document.getElementById("username").disabled = !1, meId = 0, customizer.startRendering(), aiptag.cmd.display.push(function () {
        aipDisplayTag.display("shellshock-io_300x250")
    })
}

function getRequest(e, i, t) {
    var r = new XMLHttpRequest;
    return !!r && ("function" != typeof i && (i = function () {}), "function" != typeof t && (t = function () {}), r.onreadystatechange = function () {
        if (4 == r.readyState) return 200 === r.status ? i(r.responseText) : t(r.status)
    }, r.open("GET", e, !0), r.send(null), r)
}

function showBugReport() {
    inGame && releaseKeys(), ga("send", "event", "bug report opened"), openAlertDialog("Report a Bug!", "", {
        label: "Send",
        width: "6em",
        onclick: sendBugReport
    }, {
        label: "Cancel",
        width: "6em",
        onclick: closeBugReport
    }), document.getElementById("alertButton1").style.visibility = "hidden", document.getElementById("alertMessage").appendChild(document.getElementById("bugReport")), document.getElementById("bugReport").style.display = "block"
}

function closeBugReport() {
    inGame && captureKeys(), document.getElementById("bugReport").style.display = "none", document.body.appendChild(document.getElementById("bugReport")), closeAlertDialog()
}

function objToStr(e) {
    return JSON.stringify(e, null, 4).replace(/\\|"/g, "")
}

function bugReportChanged(e) {
    var i = document.getElementById("bugDescription"),
        t = document.getElementById("bugEmail"),
        r = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
    bugReportValidateTimeout && clearTimeout(bugReportValidateTimeout), bugReportValidateTimeout = setTimeout(function () {
        "" != i.value && "" != t.value && r.test(t.value) ? document.getElementById("alertButton1").style.visibility = "visible" : document.getElementById("alertButton1").style.visibility = "hidden"
    }, 200)
}

function sendBugReport() {
    var e = document.getElementById("bugEmail"),
        i = document.getElementById("bugDescription");
    RegExp("maps|weapons|guns|volume|sound|l(a+)g|sh(i+)t|f(u+)ck|gl(i+)tch|h(a+)ck|keep dy|keep die|g(a+)y|cheat|f(a+)g", "i");
    if (i.value.length < 16) return closeBugReport(), e.value = "", i.value = "", void setTimeout(function () {
        notify("Your bug report has been received.<br>Thank you!")
    }, 1e3);
    var t = "Version: " + version;
    if (t += "\nFirebase ID: " + dbId, t += "\nPointer lock: " + (document.pointerLockElement ? "true" : "false"), t += "\n\nGame session: " + gameSession + "\nPing: " + Math.floor(pingTotal / pingSamples) + "\nFPS: " + Math.ceil(fpsSum / 60) + "\nGame type: " + gameType + "\nPrivate game: " + privateGame + "\nKills: " + kills + "\nDeaths: " + deaths + "\nBest kill streak: " + bestKillStreak + "\nRespawn time: " + respawnTime + "\nHighest ping: " + highestPing + "\nGame ad visibility: " + document.getElementById("aipGameContainer").style.display + "\nLast ad provider: " + lastAdProvider + "\n", me) {
        var r = {};
        for (var d in me) r[d] = me[d];
        var a = {};
        me && (a.scope = me.actor.scope, a.zoomed = me.actor.zoomed), delete r.weapon, delete r.weapons, delete r.actor, delete r.previousStates, delete r.ws, t += "\n\nPlayer: " + objToStr(r), t += "\n\nActor: " + objToStr(a), t += "\n\nKeys: " + objToStr(keyIsDown), stateLog && (t += "\n\n" + objToStr(stateLog), stateLog = null);
        for (var d in me.weapons) {
            var n = {};
            for (var o in me.weapons[d]) n[o] = me.weapons[d][o];
            delete n.player, delete n.actor, t += "\n\nWeapon: " + objToStr(n)
        }
    }
    if (inGame) {
        t += "\n\nChecking for invisibility bug\n\n";
        for (var s = 0; s < players.length; s++) {
            var y = players[s];
            y && (t += y.name + ", hp: " + y.hp + ", enabled: " + y.actor.bodyMesh.isEnabled() + ", visible: " + y.actor.bodyMesh.isVisible + "\n")
        }
    }
    camera && (t += "\n\nCamera FOV: " + camera.fov + "\n\n"), t += "\n\nURL: " + window.location.href + "\nReferrer: " + document.referrer + "\nBrowser: " + navigator.appName + "\nEngine: " + navigator.product + "\nVersion: " + navigator.appVersion + "\nUser agent: " + navigator.userAgent + "\nLanguage: " + navigator.language + "\nPlatform: " + navigator.platform + "\n\nLocal storage: " + objToStr(localStorage) + "\n\nSettings: " + objToStr(settings) + "\n\nScreen size: " + screen.width + " x " + screen.height + "\nDocument size: " + document.width + " x " + document.height + "\nInner size: " + innerWidth + " x " + innerHeight + "\nAvailable size: " + screen.availWidth + " x " + screen.availHeight + "\nColor depth: " + screen.colorDepth + "\nPixel depth: " + screen.pixelDepth + "\n\nWebGL: " + objToStr(engine.getGlInfo()) + "\n\nEngine caps: " + objToStr(engine.getCaps());
    var x = {
            name: "Bug Report",
            email: e.value || "not@provided.com",
            comments: i.value + "\n\n********************\n" + console.logArray().join("\n") + "\n********************\n\n" + t
        },
        l = [];
    for (var z in x) l.push(encodeURIComponent(z) + "=" + encodeURIComponent(x[z]));
    var c = l.join("&").replace(/%20/g, "+"),
        h = new XMLHttpRequest;
    h.onreadystatechange = function () {
        h.readyState == XMLHttpRequest.DONE && 200 == h.status && setTimeout(function () {
            notify("Your bug report has been received.<br>Thank you!")
        }, 1e3)
    }, closeBugReport(), e.value = "", i.value = "", h.open("POST", location.protocol + "//" + location.hostname + "/feedback.php", !0), h.setRequestHeader("Content-type", "application/x-www-form-urlencoded"), h.send(c)
}

function openJoinBox() {
    document.getElementById("customGame").style.display = "none", document.getElementById("joinGame").style.display = "block"
}

function closeJoinBox() {
    document.getElementById("customGame").style.display = "block", document.getElementById("joinGame").style.display = "none", document.getElementById("joinCode").value = "", history.replaceState(null, null, location.pathname)
}

function play(e) {
    if (console.log("play(" + e + ")"), settings.volume > 0) try {
        BABYLON.Engine.audioEngine.audioContext.resume()
    } catch (e) {
        console.log(e)
    }
    if (0 != (username = document.getElementById("username").value.trim()).length) {
        document.body.scrollTop = document.documentElement.scrollTop = 0, createPrivateGame = e, timesPlayed = getStoredNumber("timesPlayed", 0), localStorage.setItem("timesPlayed", timesPlayed + 1);
        var i = getStoredNumber("lastPreRoll", 0);
        0 == i && (i = Date.now(), localStorage.setItem("lastPreRoll", i)), Date.now() > i + 3e5 && timesPlayed % 2 == 1 ? (document.getElementById("aipMenuContainer").style.display = "none", playVideoAd()) : joinGame()
    }
}

function joinGame() {
    console.log("joinGame()");
    var e, i = selectedServer,
        t = Comm.joinPublicGame,
        r = "ws://";
    "https:" === location.protocol && (r = "wss://");
    var r = "wss://",
        d = document.getElementById("joinCode").value.trim();
    if (createPrivateGame) t = Comm.createPrivateGame, e = r + servers[i].address;
    else if ("" != d) {
        t = Comm.joinPrivateGame, d.startsWith("#") && (d = d.substr(1)), i = Number.parseInt(d.substr(0, 1), 36), uniqueId = Number.parseInt(d.substr(1, 3), 36), uniqueKey = Number.parseInt(d.substr(4, 2), 36);
        try {
            e = r + servers[i].address
        } catch (t) {
            return console.log("Game not found - Invalid server: " + e + ", " + i), openAlertDialog("GAME NOT FOUND", "Sorry! This game ID is either<br>invalid, or no longer exists.", {
                label: "OK"
            }), uniqueId = 0, uniqueKey = 0, void(document.getElementById("joinCode").value = "")
        }
        selectedServer = i
    } else e = r + servers[i].address;
    document.getElementById("alert").focus(), openAlertDialog("CONNECTING", "Please wait!", null, null, !0), console.log("Connecting to: " + e), (ws = new WebSocket(e)).binaryType = "arraybuffer", ws.onopen = function (e) {
        console.log("WebSocket opened"), localStorage.setItem("lastUsername", username), ga("send", "event", "play game", "class", classes[selectedClass].name), fbq("trackCustom", "PlayGame", {
            charClass: classes[selectedClass].name,
            server: servers[selectedServer].name
        });
        var i = 12 + 2 * username.length;
        dbId && gameSession && (console.log("dbId and session available"), i += 2 * dbId.length + 5);
        var r = new Comm.output(i);
        r.packInt8(Comm.joinGame), r.packInt8(t), r.packInt8(gameType), r.packInt16(uniqueId), r.packInt16(uniqueKey), r.packInt8(selectedClass), r.packInt8(selectedColor), r.packInt8(personal.hat), r.packInt8(personal.stamp), r.packString(username), dbId && gameSession && (r.packInt32(gameSession), r.packString(dbId)), ws.send(r.buffer)
    }, ws.onclose = function (e) {
        if (!freezeFrame)
            if (e.code == CloseCode.gameNotFound) console.log("Game not found - id: " + uniqueId + ", key: " + uniqueKey), openAlertDialog("GAME NOT FOUND", "Sorry! This game ID is either<br>invalid, or no longer exists.", {
                label: "OK"
            }), uniqueId = 0, uniqueKey = 0, document.getElementById("joinCode").value = "";
            else if (e.code == CloseCode.gameFull) console.log("Game full - id: " + uniqueId + ", key: " + uniqueKey), openAlertDialog("GAME FULL", "Sorry, this game is currently full!<br>Wait a moment, or try another one!", {
            label: "OK"
        });
        else if (e.code == CloseCode.badName) closeAlertDialog(), openAlertDialog("INVALID NAME", "I'm going to guess you know why.", {
            label: "Yes"
        }), (e = document.getElementById("username")).value = "", e.disabled = !1, e.focus(), document.getElementById("playButton").disabled = !1;
        else if (e.code == CloseCode.mainMenu) console.log("WebSocket closing - returning to Main Menu");
        else if (inGame) console.log("Connection lost: " + e.code + " " + e.reason), openAlertDialog("CONNECTION LOST", "Please try a different server,<br> or try again later!", {
            label: "OK",
            onclick: reloadPage
        });
        else {
            console.log("Cannot connect: " + e.code + " " + e.reason);
            openAlertDialog("CANNOT CONNECT", 'Please try a different server, reload<br>the page, or try again later!<br><br>Also, visit <a href="http://websocketstest.com" target="_window">websocketstest.com</a> to check for<br>problems with your network and/or system!', {
                label: "OK",
                onclick: closeAlertDialog
            })
        }
    }, ws.onmessage = function (e) {
        var i = new Comm.input(e.data);
        switch (i.unPackInt8U()) {
            case Comm.gameJoined:
                console.log("Comm.gameJoined received"), document.getElementById("mainMenu").style.display = "none", meId = i.unPackInt8U(), myTeam = i.unPackInt8U(), gameType = i.unPackInt8U(), uniqueId = i.unPackInt16U(), uniqueKey = i.unPackInt16U(), mapIdx = i.unPackInt8U(), createPrivateGame && inviteFriends(), inGame = !0, startGame()
        }
    }
}

function setVolume(e) {
    settings.volume = e.value, localStorage.setItem("volume", settings.volume), BABYLON.Engine.audioEngine.setGlobalVolume(settings.volume), 0 == settings.volume ? BABYLON.Engine.audioEngine.audioContext.suspend() : BABYLON.Engine.audioEngine.audioContext.resume()
}

function setMusicVolume(e) {
    settings.musicVolume = e.value, localStorage.setItem("musicVolume", settings.musicVolume), Music.menu && Music.menu.setVolume(e.value), Music.game && Music.game.setVolume(e.value)
}

function setMouseSensitivity(e) {
    settings.mouseSensitivity = e.value, localStorage.setItem("mouseSensitivity", settings.mouseSensitivity)
}

function setCheckOption(e) {
    var i = e.checked;
    switch (e.id) {
        case "mouseInvert":
            i = e.checked ? -1 : 1;
            break;
        case "autoDetail":
            e.checked ? enableAutoDetail() : disableAutoDetail(), setDetailSettingsVisibility(e.checked);
            break;
        case "shadowsEnabled":
            e.checked ? enableShadows() : disableShadows();
            break;
        case "highRes":
            e.checked ? increaseResolution() : lowerResolution();
            break;
        case "enableChat":
            if (e.checked) return e.checked = !1, void openAlertDialog("WARNING", '<p style="text-align: left">While efforts have been made to filter content, it\'s not fool-proof, and chat is not moderated. Understand that people are terrible, and that you are enabling this feature entirely at your own risk!<br><br>Do you still want to enable chat?</p>', {
                label: "Yes",
                width: "5em",
                onclick: enableChat
            }, {
                label: "No",
                width: "5em",
                onclick: disableChat
            });
            disableChat()
    }
    settings[e.id] = i, localStorage.setItem(e.id, i)
}

function enableChat() {
    document.getElementById("enableChat").checked = !0, settings.enableChat = !0, localStorage.setItem("enableChat", !0), closeAlertDialog(), chatInEl.value = "Press ENTER to chat", inGame && (chatOutEl.style.display = "block", chatInEl.style.display = "block")
}

function disableChat() {
    settings.enableChat = !1, localStorage.setItem("enableChat", !1), closeAlertDialog(), inGame && (chatOutEl.style.display = "none", chatInEl.style.display = "none")
}

function setDetailSettingsVisibility(e) {
    for (var i = document.getElementsByName("detail"), t = 0; t < i.length; t++) i[t].style.visibility = e ? "hidden" : "visible";
    !e && gameScene ? (settings.shadowsEnabled = gameScene.shadowsEnabled, settings.highRes = 1 == engine.getHardwareScalingLevel(), document.getElementById("shadowsEnabled").checked = settings.shadowsEnabled, document.getElementById("highRes").checked = settings.highRes, localStorage.setItem("shadowsEnabled", settings.shadowsEnabled ? "true" : "false"), localStorage.setItem("highRes", settings.highRes ? "true" : "false")) : gameScene && (enableShadows(), increaseResolution())
}

function enableAutoDetail() {
    var e = new BABYLON.SceneOptimizerOptions(40, 4e3),
        i = new BABYLON.SceneOptimization(0);
    i.apply = disableShadows, e.optimizations.push(i);
    var t = new BABYLON.SceneOptimization(1);
    t.apply = lowerResolution, e.optimizations.push(t), BABYLON.SceneOptimizer.OptimizeAsync(gameScene, e)
}

function disableAutoDetail() {
    BABYLON.SceneOptimizer.Stop()
}

function disableShadows() {
    return gameScene.shadowsEnabled = !1, mapMesh && (mapMesh.material = gameScene.getMaterialByName("mapNoShadow")), !0
}

function enableShadows() {
    gameScene.shadowsEnabled = !0, mapMesh && (mapMesh.material = gameScene.getMaterialByName("map"))
}

function lowerResolution() {
    return engine.setHardwareScalingLevel(2), adaptToNewResolution(), !0
}

function increaseResolution() {
    engine.setHardwareScalingLevel(1), adaptToNewResolution()
}

function adaptToNewResolution() {
    reticle && reticle.resize(), hitIndicator && hitIndicator.resize(), scope && scope.crosshairs.isEnabled() && scope.show()
}

function getStoredNumber(e, i) {
    var t = localStorage.getItem(e);
    return t ? Number(t) : i
}

function getStoredBool(e, i) {
    var t = localStorage.getItem(e);
    return t ? "true" == t : i
}

function getStoredString(e, i) {
    var t = localStorage.getItem(e);
    return t || i
}

function refactorConfigKeys(e) {
    var i = document.getElementsByName("config");
    Array.prototype.slice.call(i).forEach(function (i) {
        i != e && i.innerText == e.innerText && (delete inputToControlMap[i.innerText], i.style.fontWeight = "normal", i.style.color = "#aaa", i.innerText = "undefined")
    })
}

function setControl(e) {
    refactorConfigKeys(e), delete inputToControlMap[e.oldText], inputToControlMap[e.innerText] = e.id, controlEl = null, window.onkeydown = null, window.onkeyup = null, localStorage.setItem("controlConfig", JSON.stringify(inputToControlMap))
}

function configKey(e) {
    var i = e.target;
    e = e || window.event, i == controlEl ? (1 == e.button && event.preventDefault(), i.style.fontWeight = "bold", i.style.color = "#fff", i.innerText = "MOUSE " + e.button, setControl(i)) : (controlEl && (controlEl.style.fontWeight = "bold", controlEl.style.color = "#fff", controlEl.innerText = controlEl.oldText), i.oldText = i.innerText, i.style.fontWeight = "normal", i.style.color = "#edc", i.innerText = "Press key or button", controlEl = i, i.focus(), inGame && releaseKeys(), window.onkeydown = function (e) {
        var t = (e = e || window.event).key;
        if ("Escape" != t && "Tab" != t && "Enter" != t) return " " == t && (t = "space", e.preventDefault()), i.style.fontWeight = "bold", i.style.color = "#fff", i.innerText = t.toLocaleUpperCase(), setControl(i), e.stopPropagation(), !1;
        i.style.fontWeight = "bold", i.style.color = "#fff", i.innerText = i.oldText, controlEl = null
    }, window.onkeyup = function (e) {
        return e.stopPropagation(), !1
    })
}

function showBigAd() {
    document.getElementById("bigAd").style.display = "block", document.getElementById("bigAdImg").src = "img/ads/Switch-SlayawayCamp.jpg", ga("send", "event", {
        eventCategory: "Big ad",
        eventAction: "show",
        eventLabel: "Slayaway Camp Switch"
    }), setTimeout(function () {
        hideBigAd()
    }, 15e3)
}

function hideBigAd() {
    document.getElementById("bigAd").style.display = "none", aiptag.cmd.display.push(function () {
        aipDisplayTag.display("shellshock-io_300x250")
    })
}

function startAlertBar() {
    var e = document.getElementById("alertFooter");
    e.style.display = "block", alertBarInterval = interval.set(function () {
        e.innerText += "-", e.innerText.length > 10 && (e.innerText = "-")
    }, 200)
}

function openAlertDialog(e, i, t, r, d) {
    document.getElementById("aipBanner").style.display = "none", document.getElementById("alert").style.display = "block", document.getElementById("overlay").style.display = "block", document.getElementById("alertHeader").innerHTML = e, document.getElementById("alertMessage").innerHTML = i;
    a = document.getElementById("alertButton1");
    t ? (a.style.display = "inline-block", a.style.visibility = "visible", a.innerHTML = t.label || "OK", a.style.width = t.width || "80px", a.onclick = t.onclick || closeAlertDialog) : a.style.display = "none";
    var a = document.getElementById("alertButton2");
    r ? (a.style.display = "inline-block", a.style.visibility = "visible", a.innerHTML = r.label || "Cancel", a.style.width = r.width || "80px", a.onclick = r.onclick || closeAlertDialog) : a.style.display = "none", d ? startAlertBar() : (document.getElementById("alertFooter").style.display = "none", interval.clear(alertBarInterval)), document.exitPointerLock(), window.onkeydown = null, window.onkeyup = null
}

function closeAlertDialog() {
    document.getElementById("alert").style.display = "none", document.getElementById("overlay").style.display = "none", document.getElementById("alertFooter").style.display = "none", document.getElementById("username").disabled = !1, document.getElementById("aipBanner").style.display = "block", clearInterval(alertBarInterval)
}

function showMainMenuConfirm() {
    openAlertDialog("MAIN MENU", "Leave game and return<br>to the main menu?", {
        label: "Yes",
        width: "4em",
        onclick: showMainMenu
    }, {
        label: "No",
        width: "4em",
        onclick: closeAlertDialog
    })
}

function reloadPage() {
    window.location.reload()
}

function showMainMenu() {
    if (engine && engine.stopRenderLoop(), openAlertDialog("LOADING", "Just a moment!", null, null, !0), document.body.style.overflow = "visible", window.scrollY = 0, inGame) {
        if (me && (dbStats.kills += kills, dbStats.deaths += deaths, dbStats.streak = Math.max(bestKillStreak, dbStats.streak), updatePlayerStatsDisplay()), interval.clearAll(), timeout.clearAll(), pingServers(), hideGameDom(), document.getElementById("aipMenuContainer").style.display = "block", document.getElementById("aipMenuContainer").appendChild(aipBanner), aiptag.cmd.display.push(function () {
                aipDisplayTag.refresh("shellshock-io_300x250")
            }), ws.close(CloseCode.mainMenu), ws = null, releaseKeys(), gameStartTime > 0) {
            var e = Date.now() - gameStartTime;
            if (ga("send", "timing", "game", "play time", e), fbq("trackCustom", "EndGame", {
                    timePlayed: e
                }), me && kills > 0) {
                var i = Math.floor(kills / Math.max(kills + deaths, 1) * 100);
                ga("send", "event", "player stats", "kill ratio", classes[me.charClass].name, i), ga("send", "event", "player stats", "best kill streak", classes[me.charClass].name, bestKillStreak)
            }
        }
        gameScene.dispose()
    }
    inGame = !1, customizer = new Customizer(function () {
        onResourcesLoaded()
    })
}

function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)(i = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen) && i.call(document);
    else {
        var e = document.body,
            i = e.requestFullscreen || e.webkitRequestFullscreen || e.mozRequestFullScreen || e.msRequestFullscreen;
        i && (i.call(e), ga("send", "event", "fullscreen"))
    }
}

function openCustomizerFromMainMenu() {
    document.getElementById("aipMenuContainer").style.display = "none", menuOut("mainMenu"), customizer.open()
}

function onFullscreenChange() {
    engine.resize()
}

function openSettingsMenu() {
    ga("send", "event", "open settings"), document.getElementById("settings").style.display = "block", document.getElementById("help").style.display = "none", localStorage.setItem("hideHelp", 1), inGame && 1 == settings.enableChat && initChatIn()
}

function closeSettingsMenu() {
    document.getElementById("settings").style.display = "none", inGame && captureKeys()
}

function showChangelog() {
    ga("send", "event", "view changelog"), openAlertDialog("Version " + version, document.getElementById("changelog").innerHTML, {
        label: "OK"
    })
}

function getFloatingNameWidth(e, i) {
    var t = nameTestCanvas.getContext("2d");
    return t.font = "bold " + i + "px Nunito, sans-serif", t.measureText(e).width
}

function fixStringWidth(e, i) {
    i = i || 80;
    var t = nameTestCanvas.getContext("2d");
    for (t.font = "1em Nunito, sans-serif";;) {
        if (t.measureText(e).width < i) break;
        e = e.substr(0, e.length - 1)
    }
    return e
}

function notify(e, i) {
    i = i || 4e3;
    var t = document.getElementById("notification");
    t.style.opacity = 0, t.style.top = "-3.5em", t.style.display = "flex", document.getElementById("notificationMessage").innerHTML = e;
    var r = 0,
        d = setInterval(function () {
            r++, t.style.opacity = r / 8, t.style.top = r / 2 - 3.5 + "em", 8 == r && (clearInterval(d), setTimeout(function () {
                d = setInterval(function () {
                    t.style.opacity = r / 8, t.style.top = r / 2 - 3.5 + "em", 0 == --r && (clearInterval(d), t.style.display = "none")
                }, 32)
            }, i))
        }, 32)
}

function promoteLogin() {
    var e = 'Login to enable this feature and others, including:<ul style="text-align: left"><li>Stat tracking - kills, deaths, etc.<li>Custom shell colors<li>Hats and accessories<li>New weapons (coming soon!)</ul>';
    inGame ? openAlertDialog("Feature Unavailable to Guests", e, {
        label: "OK",
        width: "6em",
        onclick: closeAlertDialog
    }) : openAlertDialog("Feature Unavailable to Guests", e, {
        label: "Login",
        width: "6em",
        onclick: openLoginDialog
    }, {
        label: "Close",
        width: "6em",
        onclick: closeAlertDialog
    })
}

function playVideoAd() {
    BABYLON.Engine.audioEngine.setGlobalVolume(0), lastAdProvider = 0, queueVideoAd = !1;
    console.log("AIP"), document.getElementById("overlay").style.display = "block", aiptag.cmd.player.push(function () {
        adplayer.startPreRoll()
    }), localStorage.setItem("lastPreRoll", Date.now())
}

function boltEventHandlers() {
    Bolt.on("pre-content-player", "showHiddenContainer", boltPlayerDone)
}

function boltPlayerDone() {
    var e = document.querySelectorAll('[data-id="pre-content-player"]')[0];
    e.parentNode.removeChild(e), document.getElementById("playwireModal").style.display = "none", inGame ? document.getElementById("deathBox").style.display = "block" : joinGame(), BABYLON.Engine.audioEngine.setGlobalVolume(settings.volume)
}

function showGameDom() {
    gameType == GameType.teams && (document.getElementById("switchTeamButton").style.visibility = "visible"), document.getElementById("homeButton").style.visibility = "visible", document.getElementById("friendsButton").style.visibility = "visible", document.getElementById("game").style.display = "block"
}

function hideGameDom() {
    document.getElementById("switchTeamButton").style.visibility = "hidden", document.getElementById("homeButton").style.visibility = "hidden", document.getElementById("friendsButton").style.visibility = "hidden", document.getElementById("inviteFriends").style.display = "none", document.getElementById("game").style.display = "none"
}

function updatePlayerStatsDisplay() {
    var e = Math.floor(dbStats.kills / Math.max(dbStats.deaths, 1) * 100) / 100;
    document.getElementById("playerStatValues").innerHTML = dbStats.kills.toLocaleString() + "<br>" + dbStats.deaths.toLocaleString() + "<br>" + e + "<br>" + dbStats.streak.toLocaleString()
}

function menuIn(e, i) {
    document.getElementById(e).style.display = "block", i && i()
}

function menuOut(e) {
    document.getElementById(e).style.display = "none"
}

function PlayerActor(e) {
    this.player = e, this.mesh = new BABYLON.TransformNode, this.hat = null;
    e.hatIdx, e.stampIdx;
    this.bodyMesh = scene.cloneMesh("egg", this.mesh), this.bodyMesh.position.y = .32, this.bodyMesh.player = this.player, this.bodyMesh.material = scene.getMaterialByName("eggShell"), this.bodyMesh.material.setTexture("textureSampler", stampTexture), this.explodeMesh = scene.cloneMesh("eggExplode", this.mesh), this.explodeMesh.position.y = .32, this.explodeMesh.parent = this.mesh, this.explodeMesh.setMaterial(scene.getMaterialByName("normalBackFace")), this.explodeMesh.setEnabled(!1), this.whiteMesh = scene.cloneMesh("eggWhite", this.mesh), this.whiteMesh.parent = this.explodeMesh, this.whiteMesh.setEnabled(!1), this.yolkMesh = scene.cloneMesh("eggYolk", this.mesh), this.yolkMesh.parent = this.explodeMesh, this.yolkMesh.setEnabled(!1), this.head = new BABYLON.TransformNode, this.head.parent = this.mesh, this.head.position.y = .3, this.head.position.z = 0, this.gunContainer = new BABYLON.TransformNode, this.gunContainer.parent = this.head, this.gunContainer.rotation.y = -.14, this.gunContainer.rotation.x = -.035, this.gunContainer.animations.push(gunRotationAnimation), this.gunContainer.animations.push(gunScaleAnimation), this.gunContainer.animations.push(gunPositionAnimation), this.eye = new BABYLON.TransformNode, this.eye.position.y = .1, this.eye.position.x = .1, this.eye.parent = this.head, this.hands = scene.cloneMesh("hands", this.gunContainer), this.skeleton = scene.cloneSkeleton("eggSkeleton"), this.hands.skeleton = this.skeleton, this.hands.material = scene.getMaterialByName("standard"), this.bodyMesh.overlayColor = BABYLON.Color3.Green(), this.hands.overlayColor = BABYLON.Color3.Green(), this.player.shield > 0 && (this.bodyMesh.renderOverlay = !0, this.hands.renderOverlay = !0), this.setShellColor(this.player.shellColor), shake = 0, shadowGen && shadowGen.getShadowMap().renderList.push(this.bodyMesh), inGame ? (this.player.id == meId ? this.hands.setRenderingGroupId(1) : (this.setupNameSprite(), this.showNameSprite()), inGame && this.updateTeam()) : (this.bodyMesh.outlineColor = teamColors.outline[0].clone(), this.bodyMesh.outlineColor.a = 0), this.mesh.position.x = this.player.x, this.mesh.position.y = this.player.y, this.mesh.position.z = this.player.z, this.deathSound = Sounds.shellBurst.clone(), this.player.id == meId ? this.hitSound = Sounds.hit.clone() : (this.eye.position.y = .5, this.eye.position.x = .1, this.eye.position.z = -1, this.player.hatIdx && (this.hat = scene.cloneMesh(Hats[this.player.hatIdx].meshName, this.bodyMesh), this.hat.position.y = -.02), this.applyStamp(this.player.stampIdx), this.hitSound = this.bodyMesh.attachSound(Sounds.hit)), playOffline && this.hands.setEnabled(!1), this.bobbleIntensity = 0, this.scope = !1, this.zoomed = !1, this.hitSoundDelay = 0
}

function loadMapMeshes(e, i) {
    function t() {
        ++r == d.length && i()
    }
    var r = 0,
        d = [loadMeshes(e, ["ground"], (MapMeshes = [
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            []
        ])[1], t), loadMeshes(e, ["wall"], MapMeshes[2], t), loadMeshes(e, ["tree"], MapMeshes[3], t), loadMeshes(e, ["halfBlock"], MapMeshes[4], t), loadMeshes(e, ["ramp"], MapMeshes[5], t), loadMeshes(e, ["ladder"], MapMeshes[6], t), loadMeshes(e, ["tank"], MapMeshes[7], t), loadMeshes(e, ["lowWall"], MapMeshes[8], t)]
}

function loadObjectMeshes(e, i) {
    loadMeshes(e, ["egg", "eggExplode", "munitions", "muzzleFlash", "items", "reticle", "mountains", "sky"], null, i)
}

function loadSounds(e, i) {
    try {
        var t = {
                spatialSound: !0,
                distanceModel: "exponential",
                rolloffFactor: 1
            },
            r = 0;

        function d() {
            30 == ++r && i()
        }
        Sounds.eggk47 = {
            fire: new BABYLON.Sound("fire", "sound/eggk47/fire.mp3", e, d, t),
            dryFire: new BABYLON.Sound("dryFire", "sound/eggk47/dry fire.mp3", e, d, t),
            cycle: new BABYLON.Sound("cycle", "sound/eggk47/full cycle.mp3", e, d, t),
            insertMag: new BABYLON.Sound("insertMag", "sound/eggk47/insert mag.mp3", e, d, t),
            removeMag: new BABYLON.Sound("removeMag", "sound/eggk47/remove mag.mp3", e, d, t)
        }, Sounds.dozenGauge = {
            fire: new BABYLON.Sound("", "sound/dozenGauge/fire.mp3", e, d, t),
            open: new BABYLON.Sound("", "sound/dozenGauge/open.mp3", e, d, t),
            load: new BABYLON.Sound("", "sound/dozenGauge/load.mp3", e, d, t),
            close: new BABYLON.Sound("", "sound/dozenGauge/close.mp3", e, d, t)
        }, Sounds.csg1 = {
            fire: new BABYLON.Sound("", "sound/csg1/fire.mp3", e, d, t),
            pullAction: new BABYLON.Sound("", "sound/csg1/pull action.mp3", e, d, t),
            releaseAction: new BABYLON.Sound("", "sound/csg1/release action.mp3", e, d, t)
        }, Sounds.cluck9mm = {
            fire: new BABYLON.Sound("fire", "sound/cluck9mm/fire.mp3", e, d, t),
            removeMag: new BABYLON.Sound("", "sound/cluck9mm/remove mag.mp3", e, d, t),
            insertMag: new BABYLON.Sound("", "sound/cluck9mm/insert mag.mp3", e, d, t)
        }, Sounds.hammerClick = new BABYLON.Sound("", "sound/hammerClick.mp3", e), Sounds.ammo = new BABYLON.Sound("", "sound/ammo.mp3", e), Sounds.shellBurst = new BABYLON.Sound("", "sound/shellBurst.mp3", e, d, t), Sounds.hit = new BABYLON.Sound("", "sound/hit.mp3", e, d, t), Sounds.grenade = {
            explode: new BABYLON.Sound("", "sound/grenade.mp3", e, d, t),
            beep: new BABYLON.Sound("", "sound/grenadeBeep.mp3", e, d, t),
            pin: new BABYLON.Sound("", "sound/grenadePin.mp3", e, d, t)
        }, Sounds.death = [];
        for (var a = 1; a < 11; a++) Sounds.death.push(new BABYLON.Sound("", "sound/death/scream" + a + ".mp3", e, d, t))
    } catch (e) {
        console.log(e)
    }
}

function loadMaterials(e) {
    try {
        var i;
        if (i = new BABYLON.StandardMaterial("bullet", e), i.emissiveColor = new BABYLON.Color3(1, 1, 1), shadowGen) {
            t = ["#define RECEIVESHADOWS"];
            engineCaps.textureFloat && t.push("#define SHADOWFULLFLOAT")
        } else var t = [];
        t.push("#define DIRT"), i = new BABYLON.ShaderMaterial("map", e, "standard", {
            attributes: ["position", "normal", "color", "uv"],
            uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor"],
            defines: t
        }), shadowGen && (i.setTexture("shadowSampler", shadowGen.getShadowMapForRendering()), i.setMatrix("shadowLightMat", shadowGen.getTransformMatrix()), i.setVector3("shadowParams", shadowGen.getDarkness(), shadowGen.getShadowMap().getSize().width, shadowGen.bias)), i.onBind = function (i) {
            var t = i.material.getEffect();
            t.setFloat4("vFogInfos", e.fogMode, e.fogStart, e.fogEnd, e.fogDensity), t.setColor3("vFogColor", e.fogColor)
        }, (i = new BABYLON.ShaderMaterial("mapNoShadow", e, "standard", {
            attributes: ["position", "normal", "color", "uv"],
            uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor"],
            defines: ["#define DIRT"]
        })).onBind = function (e) {
            var i = e.material.getEffect(),
                t = e.getScene();
            i.setFloat4("vFogInfos", t.fogMode, t.fogStart, t.fogEnd, t.fogDensity), i.setColor3("vFogColor", t.fogColor)
        }, (i = new BABYLON.ShaderMaterial("standard", e, "standard", {
            attributes: ["position", "normal", "color", "uv"],
            uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor", "colorMult"],
            defines: ["#define COLORMULT"]
        })).onBind = function (e) {
            var i = e.material.getEffect(),
                t = e.getScene();
            i.setFloat4("vFogInfos", t.fogMode, t.fogStart, t.fogEnd, t.fogDensity), i.setColor3("vFogColor", t.fogColor), i.setColor3("colorMult", e.colorMult || BABYLON.Color3.White())
        }, (i = new BABYLON.ShaderMaterial("standardInstanced", e, "standard", {
            attributes: ["position", "normal", "color", "uv", "world0", "world1", "world2", "world3"],
            uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor"],
            defines: ["#define INSTANCES"]
        })).onBind = function (e) {
            var i = e.material.getEffect(),
                t = e.getScene();
            i.setFloat4("vFogInfos", t.fogMode, t.fogStart, t.fogEnd, t.fogDensity), i.setColor3("vFogColor", t.fogColor)
        }, (i = new BABYLON.ShaderMaterial("eggShell", e, "standard", {
            attributes: ["position", "normal", "color", "uv"],
            uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor", "hp", "cameraPosition", "outlineColor", "colorMult", "stampOffset"],
            defines: ["#define EGGSHELL"]
        })).onBind = function (e) {
            var i = e.material.getEffect(),
                t = e.getScene();
            i.setFloat4("vFogInfos", t.fogMode, t.fogStart, t.fogEnd, t.fogDensity), i.setColor3("vFogColor", t.fogColor), i.setFloat("hp", e.player.hp / 100), i.setColor3("colorMult", e.colorMult || BABYLON.Color3.White()), i.setFloat3("cameraPosition", t.activeCamera.globalPosition.x, t.activeCamera.globalPosition.y, t.activeCamera.globalPosition.z), i.setColor4("outlineColor", e.outlineColor, e.outlineColor.a), i.setFloat2("stampOffset", e.stampU, e.stampV)
        }, (i = new BABYLON.ShaderMaterial("emissive", e, "standard", {
            attributes: ["position", "normal", "color", "uv"],
            uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor", "emissiveColor"],
            defines: ["#define FLASH"]
        })).onBind = function (e) {
            var i = e.material.getEffect(),
                t = e.getScene();
            i.setFloat4("vFogInfos", t.fogMode, t.fogStart, t.fogEnd, t.fogDensity), i.setColor3("vFogColor", t.fogColor), i.setColor3("emissiveColor", e.emissiveColor || BABYLON.Color3.Black())
        }, (i = new BABYLON.StandardMaterial("wireframe", e)).wireframe = !0, (i = new BABYLON.StandardMaterial("normalBackface", e)).diffuseColor = new BABYLON.Color3(.5, .5, .5), i.ambientColor = new BABYLON.Color3(.5, .5, .5), i.specularColor = new BABYLON.Color3(0, 0, 0), i.backFaceCulling = !1, i.twoSidedLighting = !0, (i = new BABYLON.StandardMaterial("muzzleFlash", e)).emissiveColor = BABYLON.Color3.White(), (i = new BABYLON.StandardMaterial("ui", e)).disableLighting = !0, i.emissiveColor = BABYLON.Color3.White(), i.fogEnabled = !1, (i = new BABYLON.StandardMaterial("eggWhite", e)).disableLighting = !0, i.alpha = .8, i.emissiveColor = BABYLON.Color3.White(), (i = new BABYLON.StandardMaterial("eggYolk", e)).disableLighting = !0, i.emissiveColor = BABYLON.Color3.White()
    } catch (e) {
        console.log(e)
    }
}

function loadMeshes(e, i, t, r) {
    function d() {
        try {
            BABYLON.SceneLoader.ImportMesh("", "models/", i[o] + ".babylon", e, function (e, i, y) {
                if (y)
                    for (var x = 0; x < y.length; x++) y[x];
                for (var l = 0; l < e.length; l++) {
                    var z = e[l];
                    z.setEnabled(!1), z.setMaterial(s), z.isPickable = !1, t && t.push(z)
                }
                o++, 0 == --a ? r && r.call(n) : d()
            })
        } catch (e) {
            console.log(e)
        }
    }
    var a = i.length,
        n = this,
        o = 0,
        s = e.getMaterialByName("standard");
    d()
}

function Bullet() {
    this.x = 0, this.y = 0, this.z = 0, this.dx = 0, this.dy = 0, this.dz = 0, this.ttl = 0, this.active = !1, this.player = null, this.damage = 20, void 0 !== BulletActor && (this.actor = new BulletActor(this))
}

function collidesWithCell(e, i, t) {
    if (!e || !i || !t || e < 0 || e >= map.width || t < 0 || t >= map.depth || i < 0 || i >= map.height) return !1;
    var r = Math.floor(e),
        d = Math.floor(i),
        a = Math.floor(t),
        n = map.data[r][d][a];
    if (n.cat && n.cat != MAP.barrier) {
        if (n.cat == MAP.ramp) switch (n.dir) {
            case 0:
                if (i - d > t - a) return !1;
                break;
            case 2:
                if (i - d > 1 - (t - a)) return !1;
                break;
            case 1:
                if (i - d > e - r) return !1;
                break;
            case 3:
                if (i - d > 1 - (e - r)) return !1
        } else if (n.cat == MAP.column) {
            if ((y = e % 1 - .5) * y + (s = t % 1 - .5) * s > .04) return !1
        } else if (n.cat == MAP.halfBlock) {
            var o = i - d,
                s = t - a;
            if ((y = e - r) > .7 || y < .3 || s > .7 || s < .3 || o > .5) return !1
        } else if (n.cat == MAP.tank) {
            var y = e - r - .5,
                o = i - d - .5,
                s = t - a - .5;
            if (0 == n.dir || 2 == n.dir) {
                if (y * y + o * o >= .25) return !1
            } else if (s * s + o * o >= .25) return n
        } else {
            if (n.cat == MAP.ladder) return !1;
            if (n.cat == MAP.lowWall) {
                var y = e % 1,
                    s = t % 1;
                if ((o = i % 1) > .25) return !1;
                switch (n.dir) {
                    case 0:
                        if (s < .75) return !1;
                        break;
                    case 1:
                        if (y < .75) return !1;
                        break;
                    case 2:
                        if (s > .25) return !1;
                        break;
                    case 3:
                        if (y > .25) return !1
                }
            }
        }
        return {
            x: r,
            y: d,
            z: a,
            cel: n
        }
    }
    return !1
}

function Grenade() {
    this.x = 0, this.y = 0, this.z = 0, this.dx = 0, this.dy = 0, this.dz = 0, this.ttl = 0, this.active = !1, this.player = null, void 0 !== GrenadeActor && (this.actor = new GrenadeActor(this))
}

function Gun(e, i) {
    this.player = e, this.subClass = i, this.highPrecision = !1
}

function Eggk47(e) {
    Gun.call(this, e, Eggk47), this.ammo = {
        rounds: 30,
        capacity: 30,
        reload: 30,
        store: 240,
        storeMax: 240,
        pickup: 30
    }, this.equipTime = 15, this.stowWeaponTime = 15, this.longReloadTime = 200, this.shortReloadTime = 145, void 0 !== Eggk47Actor && (this.actor = new Eggk47Actor(this))
}

function DozenGauge(e) {
    Gun.call(this, e, DozenGauge), this.ammo = {
        rounds: 2,
        capacity: 2,
        reload: 2,
        store: 24,
        storeMax: 24,
        pickup: 8
    }, this.equipTime = 15, this.stowWeaponTime = 15, this.longReloadTime = 140, this.shortReloadTime = 140, void 0 !== DozenGaugeActor && (this.actor = new DozenGaugeActor(this))
}

function CSG1(e) {
    Gun.call(this, e, CSG1), this.ammo = {
        rounds: 5,
        capacity: 5,
        reload: 5,
        store: 15,
        storeMax: 15,
        pickup: 5
    }, this.hasScope = !0, this.equipTime = 15, this.stowWeaponTime = 15, this.longReloadTime = 175, this.shortReloadTime = 145, this.highPrecision = !0, void 0 !== CSG1Actor && (this.actor = new CSG1Actor(this))
}

function Cluck9mm(e) {
    Gun.call(this, e, Cluck9mm), this.ammo = {
        rounds: 15,
        capacity: 15,
        reload: 15,
        store: 60,
        storeMax: 60,
        pickup: 15
    }, this.equipTime = 15, this.stowWeaponTime = 15, this.longReloadTime = 130, this.shortReloadTime = 95, void 0 !== Cluck9mmActor && (this.actor = new Cluck9mmActor(this))
}

function MunitionsManager() {
    this.bulletPool = new Pool(function () {
        return new Bullet
    }, 200), this.grenadePool = new Pool(function () {
        return new Grenade
    }, 10)
}

function Player(e) {
    if (this.id = e.id, this.name = e.name, this.charClass = e.charClass, this.team = e.team, this.shellColor = e.shellColor, this.hatIdx = e.hatIdx, this.stampIdx = e.stampIdx, this.x = e.x, this.y = e.y, this.z = e.z, this.dx = e.dx, this.dy = e.dy, this.dz = e.dz, this.viewYaw = e.viewYaw, this.controlKeys = e.controlKeys, this.moveYaw = e.moveYaw, this.pitch = e.pitch, this.totalKills = e.totalKills, this.totalDeaths = e.totalDeaths, this.killStreak = e.killStreak, this.bestKillStreak = e.bestKillStreak, this.shield = e.shield, this.hp = e.hp, this.weaponIdx = e.weaponIdx, this.clientCorrection = {
            x: 0,
            y: 0
        }, this.aimTarget = {
            x: 0,
            y: 0,
            z: 0
        }, this.rofCountdown = 0, this.triggerPulled = !1, this.shotsQueued = 0, this.reloadsQueued = 0, this.roundsToReload = 0, this.recoilCountdown = 0, this.reloadCountdown = 0, this.swapWeaponCountdown = 0, this.weaponSwapsQueued = 0, this.equipWeaponIdx = this.weaponIdx, this.shotSpread = 0, this.grenadeCount = 1, this.grenadeCapacity = 3, this.grenadeCountdown = 0, this.grenadesQueued = 0, this.jumping = !1, this.climbing = !1, this.bobble = 0, this.stateIdx = 0, this.timeOfDeath = 0, this.ready = !1, this.teamSwitchCooldown = 0, this.chatLineCap = 3, this.respawnQueued = !1, this.previousStates = [], void 0 !== PlayerActor) {
        this.actor = new PlayerActor(this);
        for (var i = 0; i < stateBufferSize; i++) this.previousStates.push({
            delta: 0,
            moveYaw: e.moveYaw,
            fire: !1,
            jump: !1,
            jumping: !1,
            climbing: !1,
            climbing: !1,
            x: e.x,
            y: e.y,
            z: e.z,
            dx: e.dx,
            dy: e.dy,
            dz: e.dz,
            controlKeys: e.controlKeys
        })
    }
    this.weapons = [new Weapons[this.charClass][0][0].class(this), new Weapons[this.charClass][1][0].class(this)], this.weapon = this.weapons[this.weaponIdx], this.actor && this.weapon.actor.equip()
}

function Pool(e, i) {
    this.size = 0, this.originalSize = i, this.constructorFn = e, this.objects = [], this.idx = 0, this.numActive = 0, this.expand(i)
}

function isBadWord(e) {
    var i = (e = " " + e + " ").toLowerCase().replace(/[^a-zA-Z0-9|!\|@|$|;|Â¡]/g, "").replace(/6|g/g, "9").replace(/b/g, "6").replace(/\||l|i|1|;|Â¡/g, "!").replace(/e/g, "3").replace(/a|@/g, "4").replace(/o/g, "0").replace(/s|\$/g, "5").replace(/t/g, "7").replace(/z/g, "2").replace(/7h3|my|y0ur|7h3!r|h!5|h3r/g, ""),
        t = i.search(/( 94y | cum| 455 )/);
    i.replace(/ /g, "");
    var r = /(4fr!c4n|mu5!!m|d0n9|n39r0|c!!7|qu33r|d!ck|w4nk|p!55|7357!c|735735|64!!5|nu75|nu72|j3w|k!k3|r374r|4u7!5|d0wn55|6006|8d|p0rn|5w4!!0w|347d!ck|347m3|347my|d!k|0r4!|5p0093|fuk|j!2|5u!c!d|m4573r6|5p0063|5p3rm|p3nu5|pu55y|6u7753x|fux|6u77h0!3|4n4!|4nu5|k!!!b!4ck5|murd3rb!4ck5|h!7!3r|w3764ck|49!n4|94y|455h0!3|5uck|j3w|5p!c|ch!nk|n!994|n!993|n!663|n!994|n!664|5h!7|6!7ch|fuck|cun7|kkk|wh0r3|f49|7w47|p3n!|r4p3w0m|r4p39!r|r4p!57|r4p3r|r4p!n|c0ck|7!75|900k)/,
        d = i.search(r);
    i.replace(/(.)(?=\1)/g, "");
    var a = i.search(r);
    return t > -1 || d > -1 || a > -1
}
BulletActor.prototype.fire = function () {
    this.mesh.setEnabled(!0), this.mesh.position.x = this.bullet.x, this.mesh.position.y = this.bullet.y, this.mesh.position.z = this.bullet.z, this.mesh.lookAt(new BABYLON.Vector3(this.bullet.x + this.bullet.dx, this.bullet.y + this.bullet.dy, this.bullet.z + this.bullet.dz)), this.mesh.rotation.x += .015, this.mesh.rotation.y -= .015, this.mesh.scaling.z = .5
}, BulletActor.prototype.update = function () {
    this.mesh.position.x = this.bullet.x, this.mesh.position.y = this.bullet.y, this.mesh.position.z = this.bullet.z, this.mesh.scaling.z = Math.min(this.mesh.scaling.z + .03, 3)
}, BulletActor.prototype.remove = function () {
    this.mesh.setEnabled(!1)
};
var v1 = new BABYLON.Vector3,
    v2 = new BABYLON.Vector3,
    MapMeshes, Sounds = {},
    Music = {},
    mapMesh;
BABYLON.Skeleton.prototype.disableBlending = function () {
    this.bones.forEach(function (e) {
        e.animations.forEach(function (e) {
            e.enableBlending = !1
        })
    })
}, BABYLON.Scene.prototype.cloneMesh = function (e, i) {
    return this.getMeshByName(e).clone("", i)
}, BABYLON.Scene.prototype.cloneSkeleton = function (e) {
    return this.getSkeletonByName(e).clone()
}, BABYLON.SceneOptimizer.OptimizeAsync = function (e, i, t, r) {
    gameScene.executeWhenReady(function () {
        BABYLON.SceneOptimizer._timer = setTimeout(function () {
            BABYLON.SceneOptimizer._CheckCurrentState(e, i, 0, t, r)
        }, i.trackerDuration)
    })
}, BABYLON.SceneOptimizer.Stop = function () {
    clearTimeout(BABYLON.SceneOptimizer._timer)
}, BABYLON.DynamicTexture.prototype.clearRect = function (e, i, t, r) {
    this._context.clearRect(e, i, t, r)
}, BABYLON.Skeleton.prototype.disableBlending = function () {
    this.bones.forEach(function (e) {
        e.animations.forEach(function (e) {
            e.enableBlending = !1
        })
    })
}, BABYLON.AbstractMesh.prototype.setLayerMask = function (e) {
    this.layerMask = e;
    for (var i = this.getChildMeshes(), t = 0; t < i.length; t++) i[t].setLayerMask(e)
}, BABYLON.AbstractMesh.prototype.setRenderingGroupId = function (e) {
    this.renderingGroupId = e;
    for (var i = this.getChildMeshes(), t = 0; t < i.length; t++) i[t].setRenderingGroupId(e)
}, BABYLON.TransformNode.prototype.setVisible = function (e) {
    this.isVisible = e, e ? this.unfreezeWorldMatrix() : this.freezeWorldMatrix();
    for (var i = this.getChildTransformNodes(), t = 0; t < i.length; t++) i[t].setVisible(e)
}, BABYLON.AbstractMesh.prototype.setMaterial = function (e) {
    this.material = e;
    for (var i = this.getChildMeshes(), t = 0; t < i.length; t++) i[t].setMaterial(e)
}, BABYLON.AbstractMesh.prototype.attachSound = function (e) {
    this.attachedSounds || (this.attachedSounds = []);
    var i = e.clone();
    return i.attachToMesh(this), this.attachedSounds.push(i), i
}, BABYLON.TransformNode.prototype.disposeOfSounds = function () {
    if (this.attachedSounds)
        for (var e in this.attachedSounds) {
            var i = this.attachedSounds[e];
            i && (i.detachFromMesh(), i.dispose())
        }
    for (var t = this.getChildTransformNodes(), r = 0; r < t.length; r++) t[r].disposeOfSounds()
};
var gameScene, nameTexture, nameSprites, bulletHoleManager, explosionSmokeManager, explosionFireManager, respawnTime, players, keyIsDown, map, inputTally, light, uiCamera, me, grenadeThrowPower, grenadePowerUp = !1,
    chatting, mapOverview, mapOverviewAxis = 0,
    lastTimeStamp, lastDelta, fps, fpsSum, fpsIdx, kills, deaths, bestKillStreak, pingInterval, teamColors = {
        text: ["rgba(255, 255, 255, 1)", "rgba(64, 224, 255, 1)", "rgba(255, 192, 160, 1)"],
        meBackground: ["rgba(255, 192, 64, 0.75)", "rgba(0, 192, 255, 0.8)", "rgba(192, 64, 32, 0.8)"],
        themBackground: ["rgba(0, 0, 0, 0.25)", "rgba(0, 64, 192, 0.3)", "rgba(192, 64, 32, 0.3)"],
        outline: [new BABYLON.Color4(1, 1, 1, 1), new BABYLON.Color4(0, .75, 1, 1), new BABYLON.Color4(1, .25, .25, 1)]
    },
    scope, reticle, hitIndicator, munitionsManager, itemManager, lastMouseMovement = {},
    queueVideoAd, gamepadState = {
        fire: !1,
        grenade: !1,
        scope: !1,
        reload: !1,
        weapon: !1
    },
    smokeColor = new BABYLON.Color4(.2, .2, .2, 1),
    fireColor = new BABYLON.Color4(1, .8, .2, 1),
    fireColors = [{
        pos: 0,
        color: new BABYLON.Color4(1, .9, .8, 1)
    }, {
        pos: .2,
        color: new BABYLON.Color4(1, .5, .1, 1)
    }, {
        pos: .4,
        color: new BABYLON.Color4(.6, .2, 0, 1)
    }, {
        pos: .7,
        color: new BABYLON.Color4(0, 0, 0, 0)
    }, {
        pos: 1,
        color: new BABYLON.Color4(0, 0, 0, 0)
    }],
    killDisplayTimeout, chatParser = document.createElement("DIV"),
    SPS, rotInc = Math.PI / 2,
    pingStartTime, lastLeadingTeam = 1,
    lastKey = null,
    controlToBitmask = {
        up: 1,
        down: 2,
        left: 4,
        right: 8
    },
    debugWindow;
Scope.prototype.show = function () {
    var e = engine.getRenderHeight();
    this.crosshairs.scaling.x = e / 2, this.crosshairs.scaling.y = e / 2, this.crosshairs.setEnabled(!0), document.getElementById("scopeBorder").style.display = "block", camera.viewport.width = e / engine.getRenderWidth(), camera.viewport.x = .5 - .5 * camera.viewport.width
}, Scope.prototype.hide = function () {
    this.crosshairs.setEnabled(!1), document.getElementById("scopeBorder").style.display = "none", camera.viewport.width = 1, camera.viewport.x = 0
}, HitIndicator.prototype.resize = function () {
    this.mesh.scaling.x = engine.getRenderWidth(), this.mesh.scaling.y = engine.getRenderHeight()
}, HitIndicator.prototype.update = function (e) {
    for (var i = 7; i < 48; i += 4) this.colors[i] -= (this.colors[i] + .5) / 10 * e;
    var t = Math.pow(.9, e);
    me && !me.isDead() && (camera.position.x *= t, camera.position.z *= t), this.mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, this.colors, !0)
}, HitIndicator.prototype.hit = function (e, i) {
    var t = Math.radRange(-Math.atan2(e, -i) - me.viewYaw + .393);
    t = Math.floor(t / Math.PI2 * 8);
    var r = new BABYLON.Vector2(-this.positions[3 * t + 3], -this.positions[3 * t + 4]).normalize();
    camera.position.x = .03 * r.x, camera.position.z = .03 * r.y, this.colors[4 * t + 7] = 2
}, Reticle.prototype.update = function (e) {
    if (me.weapon)
        for (var i = 0; i < 4; i++) {
            var t = i * Math.PI / 2,
                r = me.shotSpread + me.weapon.subClass.accuracy;
            this.lines[i].position.x = -Math.sin(t) * r, this.lines[i].position.y = Math.cos(t) * r
        }
}, Reticle.prototype.resize = function () {
    var e = engine.getRenderHeight() / 640;
    this.mesh.scaling.x = e, this.mesh.scaling.y = e
};
var rays, rayIdx = 0;
window.console = function (e) {
    window.console && e || (e = {});
    var i = [];
    return {
        log: function () {
            this.addLog(arguments), e.log && e.log.apply(e, arguments)
        },
        warn: function () {
            this.addLog(arguments), e.warn && e.warn.apply(e, arguments)
        },
        error: function () {
            this.addLog(arguments), e.error && e.error.apply(e, arguments)
        },
        info: function () {
            this.addLog(arguments), e.info && e.info.apply(e, arguments)
        },
        addLog: function (e) {
            var t = e[0];
            "object" == typeof t && (t = JSON.stringify(t)), i.push(t), i.length > 100 && i.shift()
        },
        logArray: function () {
            return i
        },
        clearLog: function () {
            i = []
        }
    }
}(window.console);
var personal = localStorage.getItem("personal");
personal ? personal = JSON.parse(personal) : (personal = {
    hat: 0,
    hatRotation: 0,
    stamp: 0,
    weapons: [
        [0, 0],
        [0, 0],
        [0, 0]
    ]
}, localStorage.setItem("personal", JSON.stringify(personal)));
var weaponStats = {
    totalDamage: {
        name: "damage",
        max: -1e3,
        min: 1e3,
        flip: !1
    },
    accuracy: {
        name: "accuracy",
        max: -1e3,
        min: 1e3,
        flip: !0
    },
    rof: {
        name: "fireRate",
        max: -1e3,
        min: 1e3,
        flip: !0
    },
    range: {
        name: "range",
        max: -1e3,
        min: 1e3,
        flip: !1
    }
};
Customizer.prototype.onResourcesLoaded = function () {
    var e = this;
    scene = this.scene;
    try {
        this.avatar = new function (i) {
            this.id = -1, this.name = "", this.x = 0, this.y = 0, this.z = 0, this.hp = 100, this.shellColor = 0, this.hatIdx = personal.hat, this.stampIdx = personal.stamp, this.actor = new PlayerActor(this), this.actor.mesh.rotation.y = e.rotY, this.weapon = new classes[i].weapon(this), this.weapon.actor.equip()
        }(selectedClass), this.updateClassInfo(), this.avatar.actor.setShellColor(selectedColor);
        var i = Date.now();
        this.scene.registerBeforeRender(function () {
            var t = Date.now(),
                r = t - i;
            i = t, r /= 17, e.update(r)
        })
    } catch (e) {
        console.log(e)
    }
}, Customizer.prototype.startRendering = function () {
    var e = this;
    engine.runRenderLoop(function () {
        e.scene.render()
    })
}, Customizer.prototype.update = function (e) {
    if (this.camera.target.x += (this.camX - this.camera.target.x) / 5, this.camera.target.y += (this.camY - this.camera.target.y) / 5, this.camera.radius += (this.camRadius - this.camera.radius) / 5, this.avatar.actor.head.rotation.x += (this.rotX - this.avatar.actor.head.rotation.x) / 5, this.avatar.actor.mesh.rotation.y += (this.rotY - this.avatar.actor.mesh.rotation.y) / 5, this.avatar.actor.mesh.rotation.x = .5 * this.avatar.actor.head.rotation.x, this.avatar.actor.mesh.position.x = .1 * -this.avatar.actor.mesh.rotation.y, this.avatar.actor.mesh.position.y += e * this.jump, this.jump -= .002 * e, this.avatar.actor.mesh.position.y = Math.max(0, this.avatar.actor.mesh.position.y + this.jump * e), this.turnCountdown -= e, this.turnCountdown <= 0) {
        var i = .6 * Math.random() - .4,
            t = 2 * Math.random() - 1 + .5 * this.camX,
            r = Math.length2(i - this.rotX, t - this.rotY);
        this.rotX = i, this.rotY = t, this.jump = Math.min(.01, r / 100), this.turnCountdown = 90 * Math.random() + 30
    }
}, Customizer.prototype.open = function () {
    menuIn("customizationMenu"), document.getElementById("customizeButton").style.display = "none", document.getElementById("customizerBackButton").style.display = "inline", document.getElementById("customizerClassSelectorContainer").appendChild(document.getElementById("classSelector")), this.camX = .39, this.camY = .3, this.camRadius = 3.4, this.initWeaponButton(0), this.initWeaponButton(1), this.initHatButton(), this.initStampButton()
}, Customizer.prototype.close = function () {
    menuOut("customizationMenu"), document.getElementById("customizerBackButton").style.display = "none", document.getElementById("customizeButton").style.display = "inline", document.getElementById("mainMenuClassSelectorContainer").appendChild(document.getElementById("classSelector")), inGame ? (me.changeCharacter(selectedClass, personal.hat, personal.stamp, 0, 0), engine.stopRenderLoop(), scene = gameScene, startRendering(), chatting && chatInEl.focus(), aiptag.cmd.display.push(function () {
        aipDisplayTag.refresh("shellshock-io_300x250")
    })) : menuIn("mainMenu", function () {
        document.getElementById("aipMenuContainer").style.display = "block", aiptag.cmd.display.push(function () {
            aipDisplayTag.refresh("shellshock-io_300x250")
        })
    }), this.camX = 0, this.camY = .4, this.camRadius = 3.4
}, Customizer.prototype.openItemSelector = function (e, i) {
    menuOut("customizationMenu"), menuIn("itemSelectorMenu"), this.camX = .6, this.camY = .35, this.pageSize = 9, this.selectedItem = e, this.numItems = i, this.page = Math.floor(e / this.pageSize), this.renderFunction(), this.updatePageArrows(), this.highlightSelectedItem(e)
}, Customizer.prototype.updatePageArrows = function () {
    document.getElementById("itemPageLeft").style.visibility = this.page > 0 ? "visible" : "hidden", document.getElementById("itemPageRight").style.visibility = this.page < this.numItems / this.pageSize - 1 ? "visible" : "hidden";
    var e = "Page " + (this.page + 1) + "/" + Math.ceil(this.numItems / this.pageSize);
    document.getElementById("itemPageCount").innerText = e
}, Customizer.prototype.flipPage = function (e) {
    this.page += e, this.renderFunction(), this.updatePageArrows(), this.highlightSelectedItem(this.selectedItem)
}, Customizer.prototype.renderEmptyButton = function () {
    var e = document.getElementById("noItemImg");
    document.getElementById("item0").getContext("2d").drawImage(e, 0, 0)
}, Customizer.prototype.clearItemButtons = function () {
    for (var e = 0; e < this.pageSize; e++) document.getElementById("item" + e).getContext("2d").clearRect(0, 0, 256, 256)
}, Customizer.prototype.closeItemSelector = function () {
    menuOut("itemSelectorMenu"), this.open()
}, Customizer.prototype.selectItem = function (e) {
    (e += this.page * this.pageSize) < this.numItems && (this.highlightSelectedItem(e), this.selectedItem = e, this.selectFunction(e))
}, Customizer.prototype.highlightSelectedItem = function (e) {
    for (var i = 0; i < this.pageSize; i++) document.getElementById("item" + i).className = "itemButton";
    var t = this.page * this.pageSize,
        r = t + this.pageSize;
    e >= t && e < r && (e %= this.pageSize, document.getElementById("item" + e).className = "itemButtonSelected")
}, Customizer.prototype.iteratePage = function (e) {
    for (var i = this.page * this.pageSize, t = Math.min(i + this.pageSize, this.numItems), r = i, d = 0; r < t; r++, d++) e(r, d)
}, Customizer.prototype.openWeaponSelector = function (e) {
    dbId ? (this.selectFunction = this.selectWeapon, this.renderFunction = this.renderWeapons, this.slot = e, document.getElementById("itemSelectorHeader").innerText = 0 == e ? "Primary Weapons" : "Secondary Weapons", this.openItemSelector(personal.weapons[selectedClass][this.slot], Weapons[selectedClass][this.slot].length)) : promoteLogin()
}, Customizer.prototype.renderWeapons = function () {
    this.clearItemButtons();
    var e = this;
    this.iteratePage(function (i, t) {
        itemRenderer.renderToCanvas(Weapons[selectedClass][e.slot][i].class.meshName, document.getElementById("item" + t), e.weaponCam[e.slot])
    })
}, Customizer.prototype.initWeaponButton = function (e) {
    var i = document.getElementById(0 == e ? "primarySelectorButton" : "secondarySelectorButton");
    itemRenderer.renderToCanvas(Weapons[selectedClass][e][personal.weapons[selectedClass][e]].class.meshName, i, this.weaponCam[e])
}, Customizer.prototype.selectWeapon = function (e) {
    this.avatar.actor;
    personal.weapons[selectedClass][this.slot] = e, localStorage.setItem("personal", JSON.stringify(personal))
}, Customizer.prototype.openHatSelector = function () {
    dbId ? (this.selectFunction = this.selectHat, this.renderFunction = this.renderHats, document.getElementById("itemSelectorHeader").innerText = "Hats & Accessories", this.openItemSelector(personal.hat, Hats.length)) : promoteLogin()
}, Customizer.prototype.renderHats = function () {
    this.clearItemButtons();
    var e = this;
    this.iteratePage(function (i, t) {
        i > 0 ? itemRenderer.renderToCanvas(Hats[i].meshName, document.getElementById("item" + t), e.hatCam) : e.renderEmptyButton()
    })
}, Customizer.prototype.initHatButton = function () {
    var e = document.getElementById("hatSelectorButton");
    if (personal.hat > 0) itemRenderer.renderToCanvas(Hats[personal.hat].meshName, e, this.hatCam);
    else {
        var i = document.getElementById("noHatImg"),
            t = e.getContext("2d");
        t.clearRect(0, 0, 256, 256), t.drawImage(i, 0, 0)
    }
}, Customizer.prototype.selectHat = function (e) {
    var i = this.avatar.actor;
    i.hat && i.hat.dispose(), personal.hat = e, localStorage.setItem("personal", JSON.stringify(personal)), e > 0 && (i.hat = this.scene.cloneMesh(Hats[e].meshName, i.bodyMesh), i.hat.position.y = -.02, i.hat.rotation.y = personal.hatRotation * Math.PI)
}, Customizer.prototype.openStampSelector = function () {
    if (dbId) {
        this.selectFunction = this.selectStamp, this.renderFunction = this.renderStamps, document.getElementById("itemSelectorHeader").innerText = "Stamps", this.openItemSelector(personal.stamp, Stamps.length);
        var e = document.getElementById("noItemImg");
        document.getElementById("item0").getContext("2d").drawImage(e, 0, 0)
    } else promoteLogin()
}, Customizer.prototype.renderStamps = function () {
    this.clearItemButtons();
    var e = this;
    this.iteratePage(function (i, t) {
        i > 0 ? itemRenderer.renderStampToCanvas(i, document.getElementById("item" + t)) : e.renderEmptyButton()
    })
}, Customizer.prototype.initStampButton = function () {
    var e = document.getElementById("stampSelectorButton");
    if (personal.stamp > 0) itemRenderer.renderStampToCanvas(personal.stamp, e);
    else {
        var i = document.getElementById("noStampImg"),
            t = e.getContext("2d");
        t.clearRect(0, 0, 256, 256), t.drawImage(i, 0, 0)
    }
}, Customizer.prototype.selectStamp = function (e) {
    personal.stamp = e, localStorage.setItem("personal", JSON.stringify(personal)), this.avatar.actor.applyStamp(e)
}, Customizer.prototype.rotateHat = function (e) {
    personal.hatRotation = -e.value, this.avatar.actor.hat.rotation.y = personal.hatRotation * Math.PI
}, Customizer.prototype.selectColor = function (e) {
    document.getElementById("color" + selectedColor).style.borderWidth = "0.1em", document.getElementById("color" + e).style.borderWidth = "0.2em", selectedColor = e, this.avatar.actor.setShellColor(selectedColor), localStorage.setItem("selectedColor", selectedColor)
}, Customizer.prototype.selectClass = function (e) {
    selectedClass = Math.mod(selectedClass + e, classes.length), localStorage.setItem("selectedClass", selectedClass), this.avatar.weapon.actor.dispose(), this.avatar.weapon = new Weapons[selectedClass][0][0].class(this.avatar), this.avatar.weapon.actor.gunMesh.setEnabled(!0), this.avatar.actor.skeleton.beginAnimation(this.avatar.weapon.actor.name + ".fire"), this.updateClassInfo(), this.initWeaponButton(0), this.initWeaponButton(1)
}, Customizer.prototype.updateClassInfo = function () {
    document.getElementById("className").innerText = classes[selectedClass].name, document.getElementById("classWeapon").innerText = this.avatar.weapon.subClass.weaponName;
    for (var e in weaponStats) {
        var i = (this.avatar.weapon.subClass[e] + weaponStats[e].min) / (weaponStats[e].max - Math.abs(weaponStats[e].min));
        i = 5.6 - 5.5 * i, document.getElementById(weaponStats[e].name).style.borderRight = i + "em solid var(--egg-brown)"
    }
};
var flashColors = [new BABYLON.Color3(1, 1, 0), new BABYLON.Color3(0, .5, 1), new BABYLON.Color3(1, 0, 0)];
GrenadeActor.prototype.throw = function () {
    this.mesh.setEnabled(!0), this.mesh.position.x = this.grenade.x, this.mesh.position.y = this.grenade.y, this.mesh.position.z = this.grenade.z, this.grenade.player.id == meId ? this.flashColor = flashColors[0] : this.flashColor = flashColors[this.grenade.player.team], this.pinSound.play(), this.bounce()
}, GrenadeActor.prototype.update = function () {
    this.mesh.position.x = this.grenade.x, this.mesh.position.y = this.grenade.y, this.mesh.position.z = this.grenade.z, this.mesh.rotation.x += this.rx, this.mesh.rotation.y += this.ry, this.mesh.rotation.z += this.rz, Math.sqrt(this.grenade.ttl) % 2 > 1 ? (0 == this.beep && (this.beepSound.play(), this.beep = !0), this.mesh.emissiveColor = this.flashColor) : (this.mesh.emissiveColor = BABYLON.Color3.Black(), this.beep = !1)
}, GrenadeActor.prototype.remove = function () {
    this.mesh.setEnabled(!1)
}, GrenadeActor.prototype.bounce = function () {
    var e = Math.length3(this.grenade.dx, this.grenade.dy, this.grenade.dz);
    this.rx = (4 * Math.random() - 2) * e, this.ry = (4 * Math.random() - 2) * e, this.rz = (4 * Math.random() - 2) * e
}, GunActor.prototype.setup = function (e) {
    this.gunMesh = this.playerActor.gunContainer.getScene().cloneMesh(this.gun.subClass.meshName, this.playerActor.gunContainer), this.gunMesh.setEnabled(!1), this.skeleton = this.playerActor.skeleton, this.gunMesh.skeleton = this.skeleton, e && (this.muzzleFlash = this.playerActor.gunContainer.getScene().cloneMesh("muzzleFlash", this.playerActor.gunContainer), this.muzzleFlash.setEnabled(!1), this.muzzleFlash.parent = this.playerActor.gunContainer, this.muzzleFlash.position.x = .25, this.muzzleFlash.position.z = e), this.gun.player.id == meId && (this.gunMesh.setRenderingGroupId(1), this.muzzleFlash && this.muzzleFlash.setRenderingGroupId(1))
}, GunActor.prototype.addSoundEvent = function (e, i, t) {
    i += this.skeleton.getAnimationRange(this.name + "." + e).from;
    var r = new BABYLON.AnimationEvent(i, function () {
        t.play()
    });
    this.skeleton.bones[0].animations[0].addEvent(r)
}, GunActor.prototype.dispose = function () {
    this.gunMesh.dispose()
}, GunActor.prototype.stow = function () {
    var e = this;
    this.playerActor.gunContainer.getScene().beginAnimation(this.playerActor.gunContainer, 0, 30, !1, 1, function () {
        e.gunMesh.setEnabled(!1), e.gun.equip()
    })
}, GunActor.prototype.equip = function () {
    this.gunMesh.setEnabled(!0), this.skeleton.beginAnimation(this.name + ".fire"), this.playerActor.gunContainer.getScene().beginAnimation(this.playerActor.gunContainer, 40, 70, !1, 1)
}, GunActor.prototype.dryFire = function () {
    this.dryFireSound.play()
}, GunActor.prototype.fire = function () {
    if (this.fireSound.play(), this.muzzleFlash) {
        this.muzzleFlash.rotation.z = 3.141 * Math.random(), this.muzzleFlash.setEnabled(!0);
        var e = this;
        setTimeout(function () {
            e.muzzleFlash.setEnabled(!1)
        }, 40)
    }
    this.skeleton.beginAnimation(this.name + ".fire")
}, GunActor.prototype.reload = function () {
    this.gun.longReloadTime == this.gun.shortReloadTime ? this.skeleton.beginAnimation(this.name + ".reload") : this.gun.ammo.rounds > 0 ? this.skeleton.beginAnimation(this.name + ".shortReload") : this.skeleton.beginAnimation(this.name + ".longReload")
}, GunActor.prototype.update = function () {}, Eggk47Actor.prototype = Object.create(GunActor.prototype), Eggk47Actor.prototype.constructor = GunActor, DozenGaugeActor.prototype = Object.create(GunActor.prototype), DozenGaugeActor.prototype.constructor = GunActor, CSG1Actor.prototype = Object.create(GunActor.prototype), CSG1Actor.prototype.constructor = GunActor, Cluck9mmActor.prototype = Object.create(GunActor.prototype), Cluck9mmActor.prototype.constructor = GunActor, ItemActor.prototype.update = function (e) {
    this.mesh.rotation.y += .03 * e
}, ItemActor.prototype.remove = function () {
    this.mesh.setEnabled(!1)
}, AmmoActor.prototype = Object.create(ItemActor.prototype), AmmoActor.prototype.constructor = ItemActor, GrenadeItemActor.prototype = Object.create(ItemActor.prototype), GrenadeItemActor.prototype.constructor = ItemActor, ItemManager.AMMO = 0, ItemManager.GRENADE = 1, ItemManager.Constructors = [AmmoActor, GrenadeItemActor], ItemManager.prototype.update = function (e) {
    for (var i = 0; i < this.pools.length; i++) this.pools[i].forEachActive(function (i) {
        i.update(e), i.mesh.isVisible = isMeshVisible(i.mesh)
    })
}, ItemManager.prototype.spawnItem = function (e, i, t, r, d) {
    var a = this.pools[i].retrieve(e);
    a.mesh.setEnabled(!0), a.mesh.position.x = t, a.mesh.position.y = r, a.mesh.position.z = d, testing && a.mesh.freezeWorldMatrix()
}, ItemManager.prototype.collectItem = function (e, i) {
    this.pools[e].recycle(this.pools[e].objects[i]), this.pools[e].objects[i].remove()
}, ItemRenderer.prototype.renderToCanvas = function (e, i, t) {
    this.engine.clear(), this.camera.alpha = t.alpha || 0, this.camera.beta = t.beta || .5 * Math.PI, this.camera.radius = t.radius || 1;
    var r = t.y || 0,
        d = this.scene.getMeshByName(e),
        a = d.clone(),
        n = a.getBoundingInfo().boundingBox.center;
    t.primaryGun && (a.rotation.x = -.7, n.y = -.0125), (t.primaryGun || t.secondaryGun) && (a.skeleton = this.scene.getSkeletonByName("eggSkeleton"), a.skeleton.beginAnimation(d.name + ".fire"), a.skeleton.prepare()), a.setPivotMatrix(BABYLON.Matrix.Translation(-n.x, -n.y, -n.z + r)), this.scene.render(), a.dispose();
    var o = i.getContext("2d");
    o.clearRect(0, 0, 256, 256), o.drawImage(this.canvas, 0, 0)
}, ItemRenderer.prototype.renderStampToCanvas = function (e, i) {
    var t = new BABYLON.Sprite("", this.stampSprites),
        r = Stamps[e].x,
        d = Stamps[e].y;
    t.cellIndex = r + 16 * d, t.size = 1, this.camera.alpha = 0, this.camera.beta = 0, this.camera.radius = 2.5, this.scene.render(), t.dispose();
    var a = i.getContext("2d");
    a.clearRect(0, 0, 256, 256), a.drawImage(this.canvas, 0, 0)
};
var fbAppId = "503435033333554",
    scene, engine, camera, customizer, itemRenderer, stampTexture, canvas, shadowGen, engineCaps, ws, selectedClass, selectedServer, selectedColor, meId, myTeam, username, gameSession, dbId = null,
    gameStartTime, pingTotal, pingSamples, fpsTotal, fpsSamples, nextPingSample, inGame = !1,
    uniqueId, uniqueKey, mapIdx, gameType, privateGame, playOffline = !1,
    mapTest = {},
    settings = {},
    nameTestCanvas = document.createElement("canvas"),
    freezeFrame = !1,
    stateLog, firebaseUi, user, aipBanner, adplayer, createPrivateGame = !1,
    highestPing = 0,
    bigAdShown, timesPlayed, playwireTest = !1,
    lastAdProvider = null,
    chatInEl, chatOutEl, killEl, dbStats = {},
    testing = !1;
window.onerror = function (e, i, t, r) {
    var d = ["Message: " + e, "URL: " + i, "Line: " + t, "Column: " + r].join("\n");
    return console.addLog(d), !1
};
var shellColors = ["#ffffff", "#c4e3e8", "#e2bc8b", "#d48e52", "#cb6d4b", "#8d3213", "#5e260f"],
    inputToControlMap = {
        W: "up",
        S: "down",
        A: "left",
        D: "right",
        SPACE: "jump",
        "MOUSE 0": "fire",
        SHIFT: "scope",
        R: "reload",
        E: "weapon",
        Q: "grenade"
    },
    ga;
! function (e, i, t, r, d, a, n) {
    e.GoogleAnalyticsObject = d, e[d] = e[d] || function () {
        (e[d].q = e[d].q || []).push(arguments)
    }, e[d].l = 1 * new Date, a = i.createElement(t), n = i.getElementsByTagName(t)[0], a.async = 1, a.src = "https://www.google-analytics.com/analytics.js", n.parentNode.insertBefore(a, n)
}(window, document, "script", 0, "ga"), ga("create", "UA-105800112-1", "auto"), ga("send", "pageview"), window.addEventListener("contextmenu", function (e) {
    e.preventDefault()
}, !1), window.onresize = function () {
    resize()
}, window.onload = function () {
    openAlertDialog("SETTING UP", "Wait for it...", null, null, !0), chatInEl = document.getElementById("chatIn"), chatOutEl = document.getElementById("chatOut"), killEl = document.getElementById("killTicker"), aipBanner = document.getElementById("aipBanner"), window.addEventListener("error", function (e) {
        console.log(e)
    }), resize(), document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
    var e = "",
        i = 0;
    if (BABYLON.Engine.isSupported() || (e += '<li>WebGL (<a href="https://shellshock.io/faq.html#webgl" target="_window">More info</a>)', i++), (!document.exitPointerLock || navigator.userAgent.indexOf("10.1.2 Safari") >= 0) && (e += '<li>Pointer Lock (<a href="https://shellshock.io/faq.html#pointerlock" target="_window">More info</a>)', i++), localStorage || (e += "<li>LocalStorage", i++), void 0 === new KeyboardEvent("").key && (e += "<li>KeyboardEvent.key", i++), i > 0) return e = 1 == i ? "Your browser is missing a feature that Shell Shockers requires:<br><ul>" + e + "</ul>" : "Your browser is missing features that Shell Shockers requires:<br><ul>" + e + "</ul>", e += "Downloading the latest version of your browser of choice will usually correct this. Internet Explorer is not supported.", void openAlertDialog("OH, NO!", '<div style="text-align: left">' + e + "</div>");
    selectedServer = getStoredNumber("selectedServer", 0), selectedClass = getStoredNumber("selectedClass", Math.randomInt(0, classes.length)), gameType = getStoredNumber("gameType", GameType.ffa);
    for (var t = document.getElementById("gameTypeSelect"), r = 0; r < GameTypes.length; r++) {
        var d = GameTypes[r];
        d.el = document.createElement("option"), d.el.textContent = d.longName, t.appendChild(d.el)
    }
    t.selectedIndex = gameType, settings.volume = getStoredNumber("volume", 1), settings.mouseSensitivity = Math.max(Math.min(11, getStoredNumber("mouseSensitivity", 5)), 0), settings.mouseInvert = getStoredNumber("mouseInvert", 1), settings.holdToAim = getStoredBool("holdToAim", !0), settings.enableChat = getStoredBool("enableChat", !1), settings.autoDetail = getStoredBool("autoDetail", !0), settings.shadowsEnabled = getStoredBool("shadowsEnabled", !0), settings.highRes = getStoredBool("highRes", !0), document.getElementById("volume").value = settings.volume, document.getElementById("mouseSensitivity").value = settings.mouseSensitivity, document.getElementById("mouseInvert").checked = -1 == settings.mouseInvert, document.getElementById("holdToAim").checked = settings.holdToAim, document.getElementById("enableChat").checked = settings.enableChat, document.getElementById("autoDetail").checked = settings.autoDetail, document.getElementById("shadowsEnabled").checked = settings.shadowsEnabled, document.getElementById("highRes").checked = settings.highRes, setDetailSettingsVisibility(settings.autoDetail);
    var a = JSON.parse(localStorage.getItem("controlConfig"));
    for (var n in a) a.hasOwnProperty(n) && (inputToControlMap[n] = a[n]);
    for (var o in inputToControlMap) {
        var s = "" + o;
        inputToControlMap.hasOwnProperty(s) && s != s.toLocaleUpperCase() && (delete inputToControlMap[s], inputToControlMap[s.toLocaleUpperCase()] = inputToControlMap[o])
    }
    for (var n in inputToControlMap) {
        var y = document.getElementById(inputToControlMap[n]);
        y && (y.innerText = ("" + n).toLocaleUpperCase(), y.style.fontWeight = "bold", y.style.color = "#fff")
    }
    for (var x = document.getElementById("playerList"), l = document.getElementById("playerSlot"), r = 0; r < 20; r++) {
        var z = l.cloneNode(!0);
        x.appendChild(z)
    }
    getStoredNumber("hideHelp", null) && (document.getElementById("help").style.display = "none");
    var c = {
        apiKey: "AIzaSyDP4SIjKaw6A4c-zvfYxICpbEjn1rRnN50",
        authDomain: "shellshockio-181719.firebaseapp.com",
        databaseURL: "https://shellshockio-181719.firebaseio.com",
        projectId: "shellshockio-181719",
        storageBucket: "shellshockio-181719.appspot.com",
        messagingSenderId: "68327206324"
    };
    if (firebase && (firebase.initializeApp(c), firebase.auth().onAuthStateChanged(function (e) {
            if (user = e) {
                if (console.log("Login auth provider: " + user.providerData[0].providerId), !user.emailVerified && "password" == user.providerData[0].providerId) return void console.log("email not yet verified");
                loggedIn(user)
            } else document.getElementById("login").style.display = "block", document.getElementById("logout").style.display = "none"
        })), itemRenderer = new ItemRenderer, canvas = document.getElementById("canvas"), engine = new BABYLON.Engine(canvas, !0, null, !1), engineCaps = engine.getCaps(), BABYLON.Engine.audioEngine.setGlobalVolume(settings.volume), engine.allowManifestVersionDecrement = !0, 0 == settings.volume ? BABYLON.Engine.audioEngine.audioContext.suspend() : BABYLON.Engine.audioEngine.audioContext.resume(), settings.autoDetail || settings.highRes || lowerResolution(), "?openSettings" == window.location.search && openSettingsMenu(), "?playwireTest" == window.location.search && (playwireTest = !0), "?test" == window.location.search && (testing = !0), window.location.search.startsWith("?testMap")) {
        playOffline = !0;
        var h = window.location.search.split("&");
        mapTest.x = Number(h[1]), mapTest.y = Number(h[2]), mapTest.z = Number(h[3]), mapTest.pitch = Number(h[4]), mapTest.yaw = Number(h[5])
    }
    window.location.hash && (openJoinBox(), document.getElementById("joinCode").value = window.location.hash.substr(1)), aiptag.cmd.player.push(function () {
        adplayer = new aipPlayer({
            AD_WIDTH: 960,
            AD_HEIGHT: 540,
            AD_FULLSCREEN: !1,
            AD_CENTERPLAYER: !1,
            LOADING_TEXT: "loading advertisement",
            PREROLL_ELEM: function () {
                return document.getElementById("preroll")
            },
            AIP_COMPLETE: function () {
                document.getElementById("overlay").style.display = "none", inGame ? document.getElementById("deathBox").style.display = "block" : joinGame(), BABYLON.Engine.audioEngine.setGlobalVolume(settings.volume)
            },
            AIP_REMOVE: function () {
                document.getElementById("overlay").style.display = "none", BABYLON.Engine.audioEngine.setGlobalVolume(settings.volume)
            }
        })
    });
    var m = document.getElementById("username");
    m.value = getStoredString("lastUsername", ""), m.addEventListener("keyup", function (e) {
        m.value = fixStringWidth(e.target.value), "Enter" != e.code && 13 != e.keyCode || m.value.length > 0 && (m.disabled = !0, play())
    }), playOffline ? (ws = {
        send: function () {}
    }, inGame = !0, engine.stopRenderLoop(), startGame()) : pingServers(!0, function () {
        closeAlertDialog(), showMainMenu()
    })
}, window.onbeforeunload = function (e) {
    if (gameStartTime > 0) {
        var i = Date.now() - gameStartTime;
        if (ga("send", "timing", "game", "play time", i), fbq("trackCustom", "EndGame", {
                timePlayed: i
            }), me && kills > 0) {
            var t = Math.floor(kills / Math.max(kills + deaths, 1) * 100);
            ga("send", "event", "player stats", "kill ratio", classes[me.charClass].name, t), ga("send", "event", "player stats", "best kill streak", classes[me.charClass].name, bestKillStreak)
        }
    }
    pingSamples > 4 && (ga("send", "timing", "game", "ping", Math.floor(pingTotal / pingSamples), servers[selectedServer].name), ga("send", "event", "game", "stats", "fps", Math.ceil(fpsTotal / fpsSamples)), ga("send", "event", "game", "settings", "volume", settings.volume), ga("send", "event", "game", "settings", "mouse sensitivity", settings.mouseSensitivity), ga("send", "event", "game", "settings", "mouse invert", settings.mouseInvert))
};
var bugReportValidateTimeout, controlEl, alertBarInterval;
document.onfullscreenchange = onFullscreenChange, document.onmsfullscreenchange = onFullscreenChange, document.onmozfullscreenchange = onFullscreenChange, document.onwebkitfullscreenchange = onFullscreenChange;
var interval = {
        intervals: {},
        set: function (e, i) {
            var t = setInterval.apply(window, [e, i].concat([].slice.call(arguments, 2)));
            return this.intervals[t] = !0, t
        },
        clear: function (e) {
            return delete this.intervals[e], clearInterval(e)
        },
        clearAll: function () {
            for (var e = Object.keys(this.intervals), i = e.length; i-- > 0;) clearInterval(e.shift());
            this.intervals = {}
        }
    },
    timeout = {
        timeouts: {},
        set: function (e, i) {
            var t = setTimeout.apply(window, [e, i].concat([].slice.call(arguments, 2)));
            return this.timeouts[t] = !0, t
        },
        clear: function (e) {
            return delete this.timeouts[e], clearTimeout(e)
        },
        clearAll: function () {
            for (var e = Object.keys(this.timeouts), i = e.length; i-- > 0;) clearTimeout(e.shift());
            this.timeouts = {}
        }
    },
    shake;
PlayerActor.prototype.applyStamp = function (e) {
    0 == e ? (this.bodyMesh.stampU = 0, this.bodyMesh.stampV = 1) : (this.bodyMesh.stampU = Stamps[e].x / 16, this.bodyMesh.stampV = 1 - Stamps[e].y / 16)
}, PlayerActor.prototype.drawTextOnNameTexture = function (e, i, t, r, d, a) {
    var n = [{
            x: 0,
            y: -4
        }, {
            x: -4,
            y: 0
        }, {
            x: 4,
            y: 0
        }, {
            x: 0,
            y: 4
        }],
        o = [{
            x: 0,
            y: -1
        }, {
            x: -1,
            y: 0
        }, {
            x: 1,
            y: 0
        }, {
            x: 0,
            y: 1
        }];
    i += this.player.id % 4 * 512, t = -t + (2048 - 256 * Math.floor(this.player.id / 4)), a && (i += 256 - getFloatingNameWidth(e, r) / 2);
    for (s = 0; s < 4; s++) nameTexture.drawText(e, i + n[s].x, t + n[s].y, "bold " + r + "px Nunito, sans-serif", "rgba(0, 0, 0, 0.5)", "transparent");
    for (var s = 0; s < 4; s++) nameTexture.drawText(e, i + o[s].x, t + o[s].y, "bold " + r + "px Nunito, sans-serif", d, "transparent")
}, PlayerActor.prototype.setupNameSprite = function () {
    var e = this.player.id % 4 * 512,
        i = 2048 - 256 * Math.floor(this.player.id / 4);
    nameTexture.clearRect(e, i - 256, 512, 256), this.drawTextOnNameTexture(this.player.name, 0, 32, 60, "white", !0)
}, PlayerActor.prototype.updateTeam = function () {
    this.player.id == meId ? (document.getElementById("blueTeam").style.display = 1 == this.player.team ? "block" : "none", document.getElementById("redTeam").style.display = 2 == this.player.team ? "block" : "none") : this.player.team > 0 ? (this.player.team == myTeam ? this.bodyMesh.outlineColor = teamColors.outline[this.player.team].clone() : this.bodyMesh.outlineColor.a = 0, this.nameSprite && (this.nameSprite.width = .6, this.nameSprite.height = .3, this.nameSprite.color = teamColors.outline[this.player.team])) : this.bodyMesh.outlineColor.a = 0
}, PlayerActor.prototype.update = function (e) {
    var i = Math.cos(this.player.bobble) * this.bobbleIntensity,
        t = Math.abs(Math.sin(this.player.bobble) * this.bobbleIntensity),
        r = Math.sin(2 * this.player.bobble) * this.bobbleIntensity;
    if (this.player.shield > 0) {
        var d = .7 * Math.random() + .2;
        this.bodyMesh.overlayAlpha = d, this.hands.overlayAlpha = d
    }
    if (this.player.id == meId) this.scope && this.player.isAtReady(!0) ? (camera.fov = camera.fov + (this.player.weapon.actor.scopeFov - camera.fov) / 3, this.gunContainer.rotation.y *= .667, this.gunContainer.rotation.x *= .667, this.gunContainer.position.x += (-.15 - this.gunContainer.position.x) / 3, this.gunContainer.position.y += (this.player.weapon.actor.scopeY - this.gunContainer.position.y) / 4, this.gunContainer.position.z += (-.05 - this.gunContainer.position.z) / 3, this.player.weapon.hasScope && !this.zoomed && camera.fov < this.player.weapon.actor.scopeFov + .05 && (scope.show(), this.gunContainer.setEnabled(!1), this.zoomed = !0)) : (camera.fov = camera.fov + (1.25 - camera.fov) / 3, this.gunContainer.rotation.y += (2 * i - .14 - this.gunContainer.rotation.y) / 3, this.gunContainer.rotation.x += (.75 * r - .035 - this.gunContainer.rotation.x) / 3, this.gunContainer.position.x *= .667, this.gunContainer.position.y *= .667, this.gunContainer.position.z *= .667, this.zoomed && camera.fov > this.player.weapon.actor.scopeFov + .05 && (scope.hide(), this.gunContainer.setEnabled(!0), this.zoomed = !1));
    else if (this.player.team > 0 && this.player.team == myTeam && this.nameSprite) {
        var a = Math.length3(this.player.x - me.x, this.player.y - me.y, this.player.z - me.z),
            n = Math.pow(a, 1.25);
        this.nameSprite.width = n / 10 + .6, this.nameSprite.height = n / 20 + .3
    }
    var o = this.player.x - this.mesh.position.x,
        s = this.player.y - this.mesh.position.y,
        y = this.player.z - this.mesh.position.z;
    (a = Math.length3(o, s, y)) < .5 ? (this.mesh.position.x += o / 4, this.mesh.position.y += s / 4, this.mesh.position.z += y / 4) : (this.mesh.position.x = this.player.x, this.mesh.position.y = this.player.y, this.mesh.position.z = this.player.z);
    var x = .9;
    this.player.id != meId && (x = .5);
    var l = Math.radDifference(this.player.viewYaw, this.mesh.rotation.y),
        z = Math.radDifference(this.player.pitch, this.head.rotation.x);
    this.player.addRotationShotSpread(l, z), this.mesh.rotation.y += l * x, this.head.rotation.x += z * x, this.bodyMesh.rotation.x = this.head.rotation.x / 4;
    var c;
    if (c = this.player.jumping ? 0 : Math.length3(this.player.dx, this.player.dy, this.player.dz), this.bobbleIntensity += (c - this.bobbleIntensity) / 10, this.bodyMesh.rotation.z = 5 * i, this.bodyMesh.position.y = 1.5 * t + .32, shake > 0)
        if ((shake *= .9) < .001) shake = 0;
        else {
            var h = Math.random() * shake - .5 * shake,
                m = Math.random() * shake - .5 * shake,
                u = Math.random() * shake - .5 * shake;
            this.eye.rotation.x += (h - this.eye.rotation.x) / 10, this.eye.rotation.y += (m - this.eye.rotation.y) / 10, this.eye.rotation.z += (u - this.eye.rotation.z) / 10
        }
    else this.eye.rotation.x *= .9, this.eye.rotation.y *= .9, this.eye.rotation.z *= .9;
    if (this.player.id != meId) {
        var p = isMeshVisible(this.mesh, .31);
        p != this.bodyMesh.isVisible && (this.mesh.setVisible(p), p ? this.showNameSprite() : this.hideNameSprite()), this.nameSprite && this.positionNameSprite()
    }
    this.hitSoundDelay = Math.max(this.hitSoundDelay - e, 0)
}, PlayerActor.prototype.positionNameSprite = function () {
    if (this.nameSprite) {
        var e = this.mesh.position.clone();
        e.y += .5 * this.nameSprite.height + .65;
        var i = new BABYLON.Vector3(camera.globalPosition.x - e.x, camera.globalPosition.y - e.y, camera.globalPosition.z - e.z).normalize();
        i.scaleInPlace(.4), i.addInPlace(e), this.nameSprite.position = i
    }
}, PlayerActor.prototype.showNameSprite = function () {
    this.player.isDead() || this.nameSprite || (this.nameSprite = new BABYLON.Sprite("", nameSprites), this.nameSprite.invertV = !0, this.nameSprite.width = .6, this.nameSprite.height = .3, this.nameSprite.cellIndex = this.player.id, this.nameSprite.color = teamColors.outline[this.player.team])
}, PlayerActor.prototype.hideNameSprite = function () {
    this.nameSprite && (this.nameSprite.dispose(), this.nameSprite = null)
}, PlayerActor.prototype.scopeIn = function () {
    this.scope = !0
}, PlayerActor.prototype.scopeOut = function () {
    this.scope = !1
}, PlayerActor.prototype.hit = function () {
    this.hitSoundDelay <= 0 && (this.hitSound.play(), this.hitSoundDelay = 10)
}, PlayerActor.prototype.die = function () {
    this.bodyMesh.setEnabled(!1), this.head.setEnabled(!1), this.eye.setEnabled(!1), this.gunContainer.setEnabled(!1), this.player.id == meId && (scope.hide(), this.zoomed = !1, this.scope = !1, camera.fov = 1.25, document.getElementById("grenadeThrowContainer").style.visibility = "hidden"), this.hideNameSprite()
}, PlayerActor.prototype.respawn = function () {
    this.bodyMesh.setEnabled(!0), this.head.setEnabled(!0), this.eye.setEnabled(!0), this.gunContainer.setEnabled(!0), this.player.id != meId && this.showNameSprite(), this.explodeMesh.setEnabled(!1), this.whiteMesh.setEnabled(!1), this.yolkMesh.setEnabled(!1)
}, PlayerActor.prototype.remove = function () {
    this.mesh.disposeOfSounds(), this.mesh.dispose(), this.hideNameSprite()
}, PlayerActor.prototype.fire = function () {
    this.zoomed && this.player.weapon.hasScope && (shake = .25, this.eye.rotation.x = -.1)
}, PlayerActor.prototype.reachForGrenade = function () {
    var e = this;
    this.hands.skeleton.enableBlending(.2), this.hands.skeleton.beginAnimation("grenade.grab", !1, 1, function () {
        e.hands.skeleton.disableBlending()
    })
}, PlayerActor.prototype.throwGrenade = function () {
    var e = this;
    this.player.id == meId && (document.getElementById("grenadeThrowContainer").style.visibility = "hidden"), this.hands.skeleton.beginAnimation("grenade.throw", !1, 1, function () {
        e.hands.skeleton.enableBlending(.2), e.hands.skeleton.beginAnimation(e.player.weapon.actor.name + ".fire", !1, .5, function () {
            e.hands.skeleton.disableBlending()
        })
    })
}, PlayerActor.prototype.setShellColor = function (e) {
    var i = BABYLON.Color3.FromHexString(shellColors[e]);
    this.bodyMesh.colorMult = i, this.hands.colorMult = i
};
var gunRotationAnimation = new BABYLON.Animation("", "rotation", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT),
    gunScaleAnimation = new BABYLON.Animation("", "scaling", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT),
    gunPositionAnimation = new BABYLON.Animation("", "position", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT),
    gunRotationEase = new BABYLON.CubicEase;
gunRotationEase.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT), gunRotationAnimation.setEasingFunction(gunRotationEase);
var gunScaleEase = new BABYLON.CubicEase;
gunScaleEase.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT), gunScaleAnimation.setEasingFunction(gunScaleEase);
var gunPositionEase = new BABYLON.CubicEase;
gunPositionEase.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT), gunPositionAnimation.setEasingFunction(gunPositionEase);
var gunRotationKeys = [{
        frame: 0,
        value: new BABYLON.Vector3(-.035, -.14, 0)
    }, {
        frame: 30,
        value: new BABYLON.Vector3(1, -1.5, 0)
    }, {
        frame: 40,
        value: new BABYLON.Vector3(-1, -1.5, 0)
    }, {
        frame: 70,
        value: new BABYLON.Vector3(-.035, -.14, 0)
    }],
    gunScaleKeys = [{
        frame: 0,
        value: new BABYLON.Vector3(1, 1, 1)
    }, {
        frame: 30,
        value: new BABYLON.Vector3(.25, .25, .25)
    }, {
        frame: 40,
        value: new BABYLON.Vector3(.25, .25, .25)
    }, {
        frame: 70,
        value: new BABYLON.Vector3(1, 1, 1)
    }],
    gunPositionKeys = [{
        frame: 0,
        value: new BABYLON.Vector3(0, 0, 0)
    }, {
        frame: 30,
        value: new BABYLON.Vector3(.1, .1, -.2)
    }, {
        frame: 40,
        value: new BABYLON.Vector3(.1, 0, -.2)
    }, {
        frame: 70,
        value: new BABYLON.Vector3(0, 0, 0)
    }];
gunRotationAnimation.setKeys(gunRotationKeys), gunScaleAnimation.setKeys(gunScaleKeys), gunPositionAnimation.setKeys(gunPositionKeys), BABYLON.Effect.ShadersStore.standardVertexShader = "\n#include<instancesDeclaration>\n#include<bonesDeclaration>\n\nprecision lowp float;\n\n// Attributes\nattribute vec3 position;\nattribute vec3 normal;\nattribute vec4 color;\nattribute vec2 uv;\n\n// Uniforms\nuniform mat4 view;\nuniform mat4 viewProjection;\nuniform mat4 shadowLightMat;\nuniform vec3 cameraPosition;\nuniform vec3 colorMult;\n\n// Varying\nvarying vec4 vPositionFromLight;\nvarying vec3 vPositionFromCamera;\nvarying vec3 vNormal;\nvarying vec4 vColor;\nvarying vec4 vEmissiveColor;\nvarying float fFogDistance;\n\n#ifdef EGGSHELL\nvarying vec2 vUV;\n#endif\n\nfloat random(vec3 p)\n{\nvec3 K1 = vec3(23.14069263277926, 2.665144142690225, 8.2318798443);\nreturn fract(cos(dot(p, K1)) * 12345.6789);\n}\n\n// MAIN\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\nvec4 worldPosition = finalWorld * vec4(position, 1.);\n\n#ifdef RECEIVESHADOWS\nvPositionFromLight = shadowLightMat * worldPosition;\n#endif\n\nvNormal = normalize(vec3(finalWorld * vec4(normal, 0.0)));\nvColor = color;\n\n#ifdef COLORMULT\nvColor.rgb *= colorMult;\n#endif\n\n#ifdef DIRT\nvColor.rgb *= random(worldPosition.xyz) * 0.2 + 0.7;\n#endif\n\nfFogDistance = (view * worldPosition).z;\ngl_Position = viewProjection * worldPosition;\n\n#ifdef EGGSHELL\nvUV = uv;\nvPositionFromCamera = normalize(cameraPosition - worldPosition.xyz);\n#endif\n}\n", BABYLON.Effect.ShadersStore.standardPixelShader = "\n#define FOGMODE_NONE 0.\n#define FOGMODE_EXP 1.\n#define FOGMODE_EXP2 2.\n#define FOGMODE_LINEAR 3.\n#define E 2.71828\n\nprecision lowp float;\n\n// Uniforms\nuniform sampler2D shadowSampler;\nuniform vec3 shadowParams;\nuniform vec4 vFogInfos;\nuniform vec3 vFogColor;\nuniform vec3 emissiveColor;\nuniform mat4 worldView;\nuniform float hp;\nuniform vec3 colorMult;\nuniform vec4 outlineColor;\nuniform sampler2D textureSampler;\nuniform vec2 stampOffset;\n\n// Varying\nvarying vec4 vPositionFromLight;\nvarying vec3 vPositionFromCamera;\nvarying vec4 vColor;\nvarying vec2 vUV;\nvarying vec3 vNormal;\nvarying float fFogDistance;\n\nconst float sOff = .001;\n\n// FUNCTIONS\nfloat unpack(vec4 color)\n{\nconst vec4 bit_shift = vec4(1.0 / (255.0 * 255.0 * 255.0), 1.0 / (255.0 * 255.0), 1.0 / 255.0, 1.0);\nreturn dot(color, bit_shift);\n}\n\nfloat random(vec2 p)\n{\nvec2 K1 = vec2(23.14069263277926, 2.665144142690225);\nreturn fract(cos(dot(p, K1)) * 12345.6789);\n}\n\nfloat calcFogFactor()\n{\nfloat fogCoeff = 1.0;\nfloat fogStart = vFogInfos.y;\nfloat fogEnd = vFogInfos.z;\nfloat fogDensity = vFogInfos.w;\n\nfogCoeff = 1.0 / pow(E, fFogDistance * fFogDistance * fogDensity * fogDensity * 4.); // Exp2\n\nreturn clamp(fogCoeff, 0.0, 1.0);\n}\n\nfloat computeShadow(vec4 vPositionFromLight, sampler2D shadowSampler, float darkness)\n{\nvec3 depth = vPositionFromLight.xyz / vPositionFromLight.w;\ndepth = 0.5 * depth + vec3(0.5);\nvec2 uv = depth.xy;\n\nif (uv.x < 0. || uv.x > 1.0 || uv.y < 0. || uv.y > 1.0)\n{\nreturn 1.0;\n}\n\n#ifndef SHADOWFULLFLOAT\nfloat shadow = unpack(texture2D(shadowSampler, uv));\n#else\nfloat shadow = texture2D(shadowSampler, uv).x;\n#endif\n\nif (depth.z < shadow) return 1.;\nfloat s = clamp((depth.z - shadow) * 12. + 0.5, 0.5, 1.0);\nreturn min(1.0, max(s, length(vPositionFromLight.xy)));\n}\n\nvec3 desaturate(vec3 color, float amount)\n{\nvec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), color));\nreturn vec3(mix(color, gray, amount));\n}\n\n// MAIN\nvoid main(void)\n{\nvec4 color = vColor;\n\n#ifdef EGGSHELL // Show cracks and stamp texture!\ncolor.rgb = min((color.rgb - 0.5) * 4. + hp + 2., 1.);\ncolor.rgb *= colorMult;\nvec2 uv = clamp(vUV, vec2(0., 0.9375), vec2(.0625, 1.));\nuv += stampOffset;\ncolor.rgb = mix(color.rgb, texture2D(textureSampler, uv).rgb, texture2D(textureSampler, uv).a);\n#endif\n\n#ifdef RECEIVESHADOWS\nfloat s = computeShadow(vPositionFromLight, shadowSampler, shadowParams.x);\ncolor *= vec4(s, s, s, 1.);\n#endif\n\ncolor.rgb *= max(max(0., -vNormal.y * 0.4), dot(vNormal, normalize(vec3(.2, 1., .1)) * 1.) + 0.4);\n//color.rgb *= max(0., dot(vNormal, normalize(vec3(-.2, 1., -.1))) + 0.4);\n\n#ifdef FLASH\ncolor.rgb += emissiveColor;\n#endif\n\nfloat fog = calcFogFactor();\ncolor.rgb = fog * color.rgb + (1.0 - fog) * vFogColor;\n\n#ifdef EGGSHELL\nfloat f = step(dot(vNormal, vPositionFromCamera), 0.4);\ncolor.rgb = mix(color.rgb, outlineColor.rgb, f * outlineColor.a);\n#endif\n\ngl_FragColor = color;\n}\n", Bullet.prototype.remove = function () {
    munitionsManager.bulletPool.recycle(this), this.actor && this.actor.remove()
}, Bullet.prototype.update = function (e) {
    this.ttl <= 0 || this.collidesWithMap() ? this.remove() : (this.x += this.dx * e, this.y += this.dy * e, this.z += this.dz * e, this.ttl -= e, this.actor && this.actor.update())
}, Bullet.prototype.fire = function (e, i, t, r, d, a) {
    this.player = e, this.x = i.x, this.y = i.y, this.z = i.z, this.dx = t.x * a, this.dy = t.y * a, this.dz = t.z * a, this.ttl = d, this.damage = r, this.active = !0, this.actor && this.actor.fire()
}, Bullet.prototype.collidesWithMap = function () {
    var e = collidesWithCell(this.x, this.y, this.z);
    if (e) {
        if (this.actor && !testing) {
            var i = map.data[e.x][e.y][e.z];
            if (i && i.cat > 0 && MapMeshes[i.cat][i.dec]) {
                var t = new BABYLON.Ray(new BABYLON.Vector3(this.x - this.dx - e.x - .5, this.y - this.dy - e.y, this.z - this.dz - e.z - .5), new BABYLON.Vector3(this.dx, this.dy, this.dz), new BABYLON.Vector3(this.dx, this.dy, this.dz).length);
                MapMeshes[i.cat][i.dec].rotation.y = i.dir * rotInc;
                var r = t.intersectsMesh(MapMeshes[i.cat][i.dec], !1);
                if (r.hit) {
                    var d = new BABYLON.Vector3(-this.dx, -this.dy, -this.dz).normalize().scale(.005);
                    bulletHoleManager.addHole(0, r.pickedPoint.x + e.x + .5 + d.x, r.pickedPoint.y + e.y + d.y, r.pickedPoint.z + e.z + .5 + d.z)
                }
            }
        }
        return !0
    }
    return !1
};
var CloseCode = {
        gameNotFound: 4e3,
        gameFull: 4001,
        badName: 4002,
        mainMenu: 4003
    },
    Comm = {
        gameJoined: 0,
        addPlayer: 1,
        removePlayer: 2,
        chat: 3,
        controlKeys: 4,
        keyUp: 5,
        sync: 6,
        fire: 7,
        jump: 8,
        die: 9,
        hitThem: 10,
        hitMe: 11,
        collectItem: 12,
        spawnItem: 13,
        respawn: 14,
        startReload: 15,
        reload: 16,
        swapWeapon: 17,
        fireBullet: 18,
        fireShot: 19,
        joinGame: 20,
        ping: 21,
        pong: 22,
        clientReady: 23,
        requestRespawn: 24,
        throwGrenade: 25,
        joinPublicGame: 26,
        joinPrivateGame: 27,
        createPrivateGame: 28,
        gameOver: 29,
        switchTeam: 30,
        firePrecise: 31,
        notification: 32,
        changeCharacter: 33,
        playerCount: 34,
        output: function (e) {
            this.buffer = new Uint8Array(e), this.idx = 0, this.packInt8 = function (e) {
                this.buffer[this.idx] = 255 & e, this.idx++
            }, this.packInt16 = function (e) {
                this.buffer[this.idx] = 255 & e, this.buffer[this.idx + 1] = e >> 8 & 255, this.idx += 2
            }, this.packInt32 = function (e) {
                this.buffer[this.idx] = 255 & e, this.buffer[this.idx + 1] = e >> 8 & 255, this.buffer[this.idx + 2] = e >> 16 & 255, this.buffer[this.idx + 3] = e >> 24 & 255, this.idx += 4
            }, this.packRadU = function (e) {
                this.packInt16(1e4 * e)
            }, this.packRad = function (e) {
                this.packInt16(1e4 * (e + Math.PI))
            }, this.packFloat = function (e) {
                this.packInt16(300 * e)
            }, this.packDouble = function (e) {
                this.packInt32(1e6 * e)
            }, this.packString = function (e) {
                this.packInt8(e.length);
                for (var i = 0; i < e.length; i++) this.packInt16(e.charCodeAt(i))
            }
        },
        input: function (e) {
            this.buffer = new Uint8Array(e), this.idx = 0, this.isMoreDataAvailable = function () {
                return this.idx < this.buffer.length
            }, this.unPackInt8U = function () {
                var e = this.idx;
                return this.idx++, this.buffer[e]
            }, this.unPackInt8 = function () {
                return (this.unPackInt8U() + 128) % 256 - 128
            }, this.unPackInt16U = function () {
                var e = this.idx;
                return this.idx += 2, this.buffer[e] + (this.buffer[e + 1] << 8)
            }, this.unPackInt32U = function () {
                var e = this.idx;
                return this.idx += 4, this.buffer[e] + 256 * this.buffer[e + 1] + 65536 * this.buffer[e + 2] + 16777216 * this.buffer[e + 3]
            }, this.unPackInt16 = function () {
                return (this.unPackInt16U() + 32768) % 65536 - 32768
            }, this.unPackInt32 = function () {
                return (this.unPackInt32U() + 2147483648) % 4294967296 - 2147483648
            }, this.unPackRadU = function () {
                return this.unPackInt16U() / 1e4
            }, this.unPackRad = function () {
                return this.unPackRadU() - Math.PI
            }, this.unPackFloat = function () {
                return this.unPackInt16() / 300
            }, this.unPackDouble = function () {
                return this.unPackInt32() / 1e6
            }, this.unPackString = function (e) {
                e = e || 1e3;
                for (var i = Math.min(this.unPackInt8U(), e), t = new String, r = 0; r < i; r++) {
                    var d = this.unPackInt16U();
                    d > 0 && (t += String.fromCharCode(d))
                }
                return t
            }
        }
    },
    MAP = {
        blank: 0,
        ground: 1,
        block: 2,
        column: 3,
        halfBlock: 4,
        ramp: 5,
        ladder: 6,
        tank: 7,
        lowWall: 8,
        todo3: 9,
        barrier: 10
    },
    GameType = {
        ffa: 0,
        teams: 1
    },
    GameTypes = [{
        shortName: "FFA",
        longName: "Free For All"
    }, {
        shortName: "Teams",
        longName: "Teams"
    }],
    SyncRate = 8,
    GameMap = {
        makeMinMap: function (e) {
            e.min = {}, e.min.width = e.width, e.min.depth = e.depth, e.min.height = e.height, e.min.data = {};
            for (var i = 0; i < e.width; i++)
                for (var t = 0; t < e.height; t++)
                    for (var r = 0; r < e.depth; r++) {
                        var d = e.data[i][t][r];
                        d.cat && (e.min.data[d.cat] || (e.min.data[d.cat] = {}), e.min.data[d.cat][d.dec] || (e.min.data[d.cat][d.dec] = []), e.min.data[d.cat][d.dec].push({
                            x: i,
                            y: t,
                            z: r,
                            dir: d.dir
                        }))
                    }
        },
        generateMap: function (e, i, t, r) {
            Math.seed = r;
            var d = {};
            d.width = e, d.depth = i, d.height = t, d.seed = r, d.data = Array(d.width);
            for (s = 0; s < d.width; s++) {
                d.data[s] = Array(d.height);
                for (c = 0; c < d.height; c++) d.data[s][c] = Array(d.depth).fill({})
            }
            for (h = 0; h < d.width * d.depth * d.height * .2;)
                for (var a = Math.seededRandomInt(4, 8), n = Math.seededRandomInt(4, 8), o = Math.seededRandomInt(2, h % d.height), s = Math.seededRandomInt(1, d.width - 1 - a), y = Math.seededRandomInt(1, d.depth - 1 - n), x = (Math.seededRandomInt(1, 4), s); x < s + a; x++)
                    for (p = y; p < y + n; p++)
                        for (var l = 0; l < o; l++) {
                            var z = x == s || p == y || x == s + a - 1 || p == y + n - 1;
                            d.data[x][l][p].cat || h++, d.data[x][l][p] = z ? {
                                cat: 1,
                                dec: 4,
                                dir: Math.seededRandomInt(0, 4)
                            } : l % 2 == 0 ? {
                                cat: 1,
                                dec: 0,
                                dir: Math.seededRandomInt(0, 4)
                            } : {
                                cat: 1,
                                dec: 4,
                                dir: Math.seededRandomInt(0, 4)
                            }
                        }
            for (s = 0; s < d.width; s++)
                for (c = 0; c < d.height; c++)
                    for (y = 0; y < d.depth; y++) 0 == d.data[s][c][y].dec && (d.data[s][c][y] = {});
            for (m = 0; m < d.width * d.depth * d.height / 2; m++) {
                var s = Math.seededRandomInt(0, d.width),
                    c = 2 * Math.seededRandomInt(0, Math.floor(d.height / 2)),
                    y = Math.seededRandomInt(0, d.depth);
                1 == d.data[s][c][y].cat && d.data[s][c][y].dec > 0 && 4 == GameMap.numNeighbors6(d, s, c, y) && (d.data[s][c][y] = {})
            }
            for (var h = 0; h < d.width * d.depth * d.height / 60;) {
                var s = Math.seededRandomInt(1, d.width - 1),
                    c = Math.seededRandomInt(0, d.height - 1),
                    y = Math.seededRandomInt(1, d.depth - 1);
                d.data[s][c][y].cat || 0 != c && 1 != d.data[s][c - 1][y].cat || (1 != d.data[s][c][y + 1].cat || d.data[s][c + 1][y + 1].cat || d.data[s][c][y - 1].cat || 0 != c && 1 != d.data[s][c - 1][y - 1].cat ? 1 != d.data[s + 1][c][y].cat || d.data[s + 1][c + 1][y].cat || d.data[s - 1][c][y].cat || 0 != c && 1 != d.data[s - 1][c - 1][y].cat ? 1 != d.data[s][c][y - 1].cat || d.data[s][c + 1][y - 1].cat || d.data[s][c][y + 1].cat || 0 != c && 1 != d.data[s][c - 1][y + 1].cat ? 1 != d.data[s - 1][c][y].cat || d.data[s - 1][c + 1][y].cat || d.data[s + 1][c][y].cat || 0 != c && 1 != d.data[s + 1][c - 1][y].cat || (d.data[s][c][y] = {
                    cat: 2,
                    dec: 0,
                    dir: 3
                }, d.data[s][c + 1][y] = {}, d.data[s + 1][c + 1][y] = {}, h++) : (d.data[s][c][y] = {
                    cat: 2,
                    dec: 0,
                    dir: 2
                }, d.data[s][c + 1][y] = {}, d.data[s][c + 1][y + 1] = {}, h++) : (d.data[s][c][y] = {
                    cat: 2,
                    dec: 0,
                    dir: 1
                }, d.data[s][c + 1][y] = {}, d.data[s - 1][c + 1][y] = {}, h++) : (d.data[s][c][y] = {
                    cat: 2,
                    dec: 0,
                    dir: 0
                }, d.data[s][c + 1][y] = {}, d.data[s][c + 1][y - 1] = {}, h++))
            }
            for (m = 0; m < d.width * d.depth * d.height / 10; m++) {
                var s = Math.seededRandomInt(1, d.width - 1),
                    c = Math.seededRandomInt(0, d.height - 1),
                    y = Math.seededRandomInt(1, d.depth - 1);
                !d.data[s][c][y].cat && (0 == c || 1 == d.data[s][c - 1][y].cat) && GameMap.numNeighbors26(d, s, c, y) < 11 && (d.data[s][c][y] = {
                    cat: 4,
                    dec: 0,
                    dir: 0
                })
            }
            for (var m = 0; m < d.width * d.depth * d.height / 10; m++) {
                var s = Math.seededRandomInt(1, d.width - 1),
                    c = Math.seededRandomInt(0, d.height - 1),
                    y = Math.seededRandomInt(1, d.depth - 1);
                if (!d.data[s][c][y].cat && (0 == c || 1 == d.data[s][c - 1][y].cat && 4 == d.data[s][c - 1][y].dec) && GameMap.numNeighbors26(d, s, c, y) < 11) {
                    d.data[s][c][y] = {
                        cat: 1,
                        dec: Math.seededRandomInt(1, 4),
                        dir: Math.seededRandomInt(0, 4)
                    };
                    for (var u = 0; u < 20; u++) {
                        var x = s + Math.seededRandomInt(-1, 2),
                            p = y + Math.seededRandomInt(-1, 2);
                        if (4 == d.data[p][c][p].cat) break;
                        if (!d.data[p][c][p].cat && (0 == c || 1 == d.data[x][c - 1][p].cat && 4 == d.data[x][c - 1][p].dec)) {
                            d.data[x][c][p] = {
                                cat: 4,
                                dec: 0,
                                dir: 0
                            };
                            break
                        }
                    }
                }
            }
            for (s = 0; s < d.width; s++)
                for (y = 0; y < d.depth; y++)
                    for (c = 0; c < d.height - 1; c++) !d.data[s][c][y].cat && this.numNeighbors6(d, s, c, y) >= 4 && !d.data[s][c + 1][y].cat && (d.data[s][c][y] = {
                        cat: 1,
                        dec: this.firstNeighborDec(d, s, c, y),
                        dir: Math.seededRandomInt(0, 4)
                    });
            for (s = 0; s < d.width; s++)
                for (c = 0; c < d.height; c++)
                    for (y = 0; y < d.depth; y++) d.data[s][c][y].cat && 6 == GameMap.numNeighbors6(d, s, c, y) && (d.data[s][c][y].cat = 1, d.data[s][c][y].dec = 0);
            return GameMap.makeMinMap(d), d
        },
        firstNeighborDec: function (e, i, t, r) {
            for (var d = Math.max(1, i - 1); d <= Math.min(e.width - 2, i + 1); d++)
                for (var a = Math.max(0, t - 1); a <= Math.min(e.height - 1, t + 1); a++)
                    for (var n = Math.max(1, r - 1); n <= Math.min(e.depth - 2, r + 1); n++)
                        if ((i != d || t != a || r != n) && 1 == e.data[d][a][n].cat) return e.data[d][a][n].dec;
            return 0
        },
        numNeighbors6: function (e, i, t, r) {
            for (var d = 0, a = Math.max(1, i - 1); a <= Math.min(e.width - 2, i + 1); a++)
                for (var n = Math.max(0, t - 1); n <= Math.min(e.height - 1, t + 1); n++)
                    for (var o = Math.max(1, r - 1); o <= Math.min(e.depth - 2, r + 1); o++) Math.abs(a - i) + Math.abs(n - t) + Math.abs(o - r) == 1 && 1 == e.data[a][n][o].cat && d++;
            return 0 == t && d++, d
        },
        numNeighbors26: function (e, i, t, r) {
            for (var d = 0, a = Math.max(1, i - 1); a <= Math.min(e.width - 2, i + 1); a++)
                for (var n = Math.max(0, t - 1); n <= Math.min(e.height - 1, t + 1); n++)
                    for (var o = Math.max(1, r - 1); o <= Math.min(e.depth - 2, r + 1); o++) i == a && t == n && r == o || 1 == e.data[a][n][o].cat && d++;
            return 0 == t && (d += 9), d
        }
    };
Grenade.prototype.update = function (e) {
    if (this.ttl <= 0)
        if (munitionsManager.grenadePool.recycle(this), this.actor) {
            addExplosion(this.x, this.y, this.z, this.damage);
            var i = new BABYLON.Vector3(this.x, this.y, this.z);
            this.actor.explodeSound.setPosition(i), this.actor.explodeSound.play(), this.actor.remove()
        } else
            for (var t = this, r = 0; r < 20; r++) {
                var d = players[r];
                if (d && (d.id == t.player.id || 0 == d.team || d.team != t.player.team)) {
                    var a = t.x - d.x,
                        n = t.y - (d.y + .3),
                        o = t.z - d.z,
                        s = Math.length3(a, n, o),
                        y = Math.max(0, t.damage - 25 * s);
                    if (d && !d.isDead() && y > 0) {
                        for (var x = Math.normalize3({
                                x: a,
                                y: n,
                                z: o
                            }, .25), l = d.x, z = d.y + .3, c = d.z, h = !0, m = 0; m < s; m += .25) {
                            if (collidesWithCell(l, z, c)) {
                                h = !1;
                                break
                            }
                            l += x.x, z += x.y, c += x.z
                        }
                        h && hitPlayer(d, t.player, y, -a, -o)
                    }
                }
            } else {
                var u = this.dx,
                    p = this.dy,
                    g = this.dz;
                this.dy -= .003 * e;
                var f = .5 * (this.dx + u) * e,
                    v = .5 * (this.dy + p) * e,
                    w = .5 * (this.dz + g) * e;
                this.dx *= Math.pow(.99, e), this.dz *= Math.pow(.99, e), this.x += f, this.collidesWithMap() && (this.x -= f, this.dx *= -.5, this.dy *= .8, this.dz *= .8), this.y += v, this.collidesWithMap() && (this.y -= v, this.dx *= .8, this.dy *= -.5, this.dz *= .8), this.z += w, this.collidesWithMap() && (this.z -= w, this.dx *= .8, this.dy *= .8, this.dz *= -.5), this.ttl -= e, this.actor && this.actor.update()
            }
}, Grenade.prototype.throw = function (e, i, t) {
    this.player = e, this.x = i.x, this.y = i.y, this.z = i.z, this.dx = t.x, this.dy = t.y, this.dz = t.z, this.ttl = 150, this.damage = 120, this.active = !0, this.actor && this.actor.throw()
}, Grenade.prototype.collidesWithMap = function () {
    return !!collidesWithCell(this.x, this.y - .07, this.z) && (this.actor && this.actor.bounce(), !0)
}, Gun.prototype.update = function (e) {
    this.actor && this.actor.update(e)
}, Gun.prototype.collectAmmo = function () {
    return this.actor ? (this.ammo.store = Math.min(this.ammo.storeMax, this.ammo.store + this.ammo.pickup), !0) : this.ammo.store < this.ammo.storeMax && (this.ammo.store = Math.min(this.ammo.storeMax, this.ammo.store + this.ammo.pickup), !0)
}, Gun.prototype.fire = function () {
    if (this.actor) this.actor.fire();
    else {
        var e = BABYLON.Matrix.RotationYawPitchRoll(this.player.viewYaw, this.player.pitch, 0),
            i = BABYLON.Matrix.Translation(this.player.aimTarget.x, this.player.aimTarget.y, this.player.aimTarget.z),
            t = .004 * (this.player.shotSpread + this.subClass.accuracy),
            r = BABYLON.Matrix.RotationYawPitchRoll((Math.random() - .5) * t, (Math.random() - .5) * t, (Math.random() - .5) * t),
            d = (i = i.multiply(r)).getTranslation();
        d.normalize();
        var a = BABYLON.Matrix.Translation(.1, .1, .4),
            n = (a = (a = a.multiply(e)).add(BABYLON.Matrix.Translation(this.player.x, this.player.y + .3, this.player.z))).getTranslation();
        this.fireMunitions(n, d)
    }
}, Gun.prototype.equip = function () {
    this.player.weaponIdx = this.player.equipWeaponIdx, this.player.weapon = this.player.weapons[this.player.weaponIdx], this.player.weapon.actor.equip(), this.player.id == meId && updateAmmoUi()
}, Eggk47.prototype = Object.create(Gun.prototype), Eggk47.prototype.constructor = Gun, Eggk47.weaponName = "EggK-47", Eggk47.meshName = "eggk47", Eggk47.rof = 3600 / 550, Eggk47.automatic = !0, Eggk47.accuracy = 14, Eggk47.shotSpreadIncrement = 42, Eggk47.accuracySettleFactor = .89, Eggk47.damage = 45, Eggk47.totalDamage = 45, Eggk47.ttl = 30, Eggk47.velocity = .5, Eggk47.prototype.fireMunitions = function (e, i) {
    munitionsManager.fireBullet(this.player, e, i, Eggk47.damage, Eggk47.ttl, Eggk47.velocity);
    var t = new Comm.output(14);
    t.packInt8(Comm.fireBullet), t.packInt8(this.player.id), t.packFloat(e.x), t.packFloat(e.y), t.packFloat(e.z), t.packFloat(i.x), t.packFloat(i.y), t.packFloat(i.z), sendToAll(t.buffer)
}, DozenGauge.prototype = Object.create(Gun.prototype), DozenGauge.prototype.constructor = Gun, DozenGauge.weaponName = "Dozen Gauge", DozenGauge.meshName = "dozenGauge", DozenGauge.rof = 15, DozenGauge.automatic = !1, DozenGauge.accuracy = 30, DozenGauge.shotSpreadIncrement = 120, DozenGauge.accuracySettleFactor = .89, DozenGauge.damage = 10, DozenGauge.totalDamage = 200, DozenGauge.ttl = 15, DozenGauge.velocity = .45, DozenGauge.prototype.fireMunitions = function (e, i) {
    var t = now % 256;
    Math.seed = t;
    for (var r = 0; r < 20; r++) {
        var d = Math.normalize3({
            x: i.x + Math.seededRandom(-.15, .15),
            y: i.y + Math.seededRandom(-.1, .1),
            z: i.z + Math.seededRandom(-.15, .15)
        });
        munitionsManager.fireBullet(this.player, e, d, DozenGauge.damage, DozenGauge.ttl, DozenGauge.velocity)
    }
    var a = new Comm.output(15);
    a.packInt8(Comm.fireShot), a.packInt8(this.player.id), a.packFloat(e.x), a.packFloat(e.y), a.packFloat(e.z), a.packFloat(i.x), a.packFloat(i.y), a.packFloat(i.z), a.packInt8(t), sendToAll(a.buffer)
}, CSG1.prototype = Object.create(Gun.prototype), CSG1.prototype.constructor = Gun, CSG1.weaponName = "CSG-1", CSG1.meshName = "csg1", CSG1.rof = 60, CSG1.automatic = !1, CSG1.accuracy = 0, CSG1.shotSpreadIncrement = 180, CSG1.accuracySettleFactor = .96, CSG1.damage = 250, CSG1.totalDamage = 250, CSG1.ttl = 80, CSG1.velocity = .6, CSG1.prototype.fireMunitions = function (e, i) {
    munitionsManager.fireBullet(this.player, e, i, CSG1.damage, CSG1.ttl, CSG1.velocity);
    var t = new Comm.output(14);
    t.packInt8(Comm.fireBullet), t.packInt8(this.player.id), t.packFloat(e.x), t.packFloat(e.y), t.packFloat(e.z), t.packFloat(i.x), t.packFloat(i.y), t.packFloat(i.z), sendToAll(t.buffer)
}, Cluck9mm.prototype = Object.create(Gun.prototype), Cluck9mm.prototype.constructor = Gun, Cluck9mm.weaponName = "Cluck 9mm", Cluck9mm.meshName = "cluck9mm", Cluck9mm.rof = 6, Cluck9mm.automatic = !1, Cluck9mm.accuracy = 30, Cluck9mm.shotSpreadIncrement = 100, Cluck9mm.accuracySettleFactor = .85, Cluck9mm.damage = 35, Cluck9mm.totalDamage = 35, Cluck9mm.ttl = 100, Cluck9mm.velocity = .45, Cluck9mm.prototype.fireMunitions = function (e, i) {
    munitionsManager.fireBullet(this.player, e, i, Cluck9mm.damage, Cluck9mm.ttl, Cluck9mm.velocity);
    var t = new Comm.output(14);
    t.packInt8(Comm.fireBullet), t.packInt8(this.player.id), t.packFloat(e.x), t.packFloat(e.y), t.packFloat(e.z), t.packFloat(i.x), t.packFloat(i.y), t.packFloat(i.z), sendToAll(t.buffer)
};
var Hats = [null, {
        meshName: "ballCap",
        price: 0
    }, {
        meshName: "boatHat",
        price: 0
    }, {
        meshName: "topHat",
        price: 0
    }, {
        meshName: "derby",
        price: 0
    }, {
        meshName: "mounty",
        price: 0
    }, {
        meshName: "cowSheriff",
        price: 0
    }],
    Stamps = [null, {
        name: "Bullseye",
        x: 1,
        y: 0,
        price: 0
    }, {
        name: '"No" Symbol',
        x: 2,
        y: 0,
        price: 0
    }, {
        name: "Question",
        x: 3,
        y: 0,
        price: 0
    }, {
        name: "Peace",
        x: 4,
        y: 0,
        price: 0
    }, {
        name: "Thumbs Up",
        x: 5,
        y: 0,
        price: 0
    }, {
        name: "Smiley",
        x: 6,
        y: 0,
        price: 0
    }],
    Weapons = [
        [
            [{
                class: Eggk47,
                price: 0
            }],
            [{
                class: Cluck9mm,
                price: 0
            }]
        ],
        [
            [{
                class: DozenGauge,
                price: 0
            }],
            [{
                class: Cluck9mm,
                price: 0
            }]
        ],
        [
            [{
                class: CSG1,
                price: 0
            }],
            [{
                class: Cluck9mm,
                price: 0
            }]
        ]
    ];
Math.PI2 = 2 * Math.PI, Math.PI90 = Math.PI / 2, Math.mod = function (e, i) {
    var t = e % i;
    return t >= 0 ? t : t + i
}, Math.length2 = function (e, i) {
    return Math.sqrt(Math.pow(e, 2) + Math.pow(i, 2))
}, Math.length3 = function (e, i, t) {
    return Math.sqrt(Math.pow(e, 2) + Math.pow(i, 2) + Math.pow(t, 2))
}, Math.capVector2 = function (e, i) {
    var t = Math.length2(e.x, e.y);
    return t > i && (e.x *= i / t, e.y *= i / t), e
}, Math.normalize2 = function (e, i) {
    i = i || 1;
    var t = Math.length2(e.x, e.y);
    return e.x *= i / t, e.y *= i / t, e
}, Math.normalize3 = function (e, i) {
    i = i || 1;
    var t = Math.length3(e.x, e.y, e.z);
    return e.x *= i / t, e.y *= i / t, e.z *= i / t, e
}, Math.clamp = function (e, i, t) {
    return Math.max(Math.min(e, t), i)
}, Math.radAdd = function (e, i) {
    return Math.mod(e + i, Math.PI2)
}, Math.radSub = function (e, i) {
    return Math.mod(e - i, Math.PI2)
}, Math.radRange = function (e) {
    return Math.mod(e, Math.PI2)
}, Math.radDifference = function (e, i) {
    var t = (e - i + Math.PI) % Math.PI2 - Math.PI;
    return t = t < -Math.PI ? t + Math.PI2 : t
}, Math.cardVals = [0, Math.PI90, Math.PI, 3 * Math.PI90], Math.cardToRad = function (e) {
    return Math.cardVals[e]
}, Math.randomInt = function (e, i) {
    return Math.floor(Math.random() * (i - e) + e)
}, Math.seed = 100, Math.seededRandom = function (e, i) {
    return e = e || 0, i = i || 1, Math.seed = (9301 * Math.seed + 49297) % 233280, e + Math.seed / 233280 * (i - e)
}, Math.seededRandomInt = function (e, i) {
    return Math.floor(Math.seededRandom(e, i))
};
var minMaps = [{
    data: {
        1: {
            0: [{
                x: 0,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 16,
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 3,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 3,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 3,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 4,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 4,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 4,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 9,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 13,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 9,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 9,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 21,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 17,
                dir: 0
            }],
            1: [{
                x: 16,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 16,
                y: 1,
                z: 14,
                dir: 0
            }]
        },
        2: {
            4: [{
                x: 0,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 0,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 0,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 0,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 13,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 16,
                dir: 2
            }, {
                x: 1,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 1,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 1,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 1,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 1,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 1,
                y: 1,
                z: 9,
                dir: 0
            }, {
                x: 1,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 1,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 2,
                y: 1,
                z: 4,
                dir: 1
            }, {
                x: 2,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 2,
                y: 1,
                z: 11,
                dir: 1
            }, {
                x: 2,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 3,
                y: 1,
                z: 1,
                dir: 0
            }, {
                x: 3,
                y: 1,
                z: 4,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 11,
                dir: 1
            }, {
                x: 3,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 3,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 3,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 4,
                y: 1,
                z: 4,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 4,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 4,
                y: 3,
                z: 1,
                dir: 0
            }, {
                x: 4,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 5,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 5,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 5,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 6,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 6,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 8,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 8,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 8,
                y: 0,
                z: 11,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 14,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 9,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 9,
                y: 3,
                z: 1,
                dir: 0
            }, {
                x: 9,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 10,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 14,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 10,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 10,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 11,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 9,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 14,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 11,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 11,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 11,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 12,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 7,
                dir: 2
            }, {
                x: 12,
                y: 1,
                z: 8,
                dir: 2
            }, {
                x: 12,
                y: 1,
                z: 12,
                dir: 2
            }, {
                x: 12,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 14,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 17,
                dir: 3
            }, {
                x: 12,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 12,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 12,
                y: 3,
                z: 16,
                dir: 1
            }, {
                x: 12,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 13,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 12,
                dir: 2
            }, {
                x: 13,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 14,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 13,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 13,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 13,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 13,
                y: 3,
                z: 16,
                dir: 1
            }, {
                x: 13,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 14,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 12,
                dir: 2
            }, {
                x: 14,
                y: 1,
                z: 14,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 17,
                dir: 3
            }, {
                x: 14,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 14,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 14,
                y: 3,
                z: 16,
                dir: 1
            }, {
                x: 14,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 15,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 9,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 14,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 15,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 15,
                y: 3,
                z: 16,
                dir: 1
            }, {
                x: 15,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 16,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 1,
                z: 11,
                dir: 1
            }, {
                x: 16,
                y: 1,
                z: 12,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 16,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 16,
                y: 3,
                z: 1,
                dir: 2
            }, {
                x: 16,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 16,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 16,
                y: 3,
                z: 16,
                dir: 3
            }, {
                x: 16,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 17,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 17,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 0,
                dir: 3
            }, {
                x: 17,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 17,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 17,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 17,
                y: 3,
                z: 2,
                dir: 2
            }, {
                x: 17,
                y: 3,
                z: 15,
                dir: 0
            }, {
                x: 17,
                y: 3,
                z: 16,
                dir: 3
            }, {
                x: 17,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 18,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 18,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 18,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 18,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 2,
                dir: 2
            }, {
                x: 18,
                y: 3,
                z: 11,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 12,
                dir: 0
            }, {
                x: 18,
                y: 3,
                z: 13,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 14,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 16,
                dir: 3
            }, {
                x: 18,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 19,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 19,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 19,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 19,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 3,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 4,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 19,
                y: 3,
                z: 11,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 12,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 13,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 14,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 16,
                dir: 3
            }, {
                x: 19,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 20,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 20,
                y: 3,
                z: 1,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 3,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 4,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 11,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 12,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 13,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 20,
                y: 3,
                z: 16,
                dir: 3
            }, {
                x: 20,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 21,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 21,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 21,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 1,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 2,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 5,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 6,
                dir: 1
            }, {
                x: 21,
                y: 3,
                z: 10,
                dir: 1
            }, {
                x: 21,
                y: 3,
                z: 11,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 12,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 13,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 14,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 15,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 16,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 17,
                dir: 3
            }],
            5: [{
                x: 0,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 0,
                y: 1,
                z: 14,
                dir: 0
            }, {
                x: 0,
                y: 1,
                z: 15,
                dir: 0
            }, {
                x: 0,
                y: 1,
                z: 16,
                dir: 0
            }, {
                x: 0,
                y: 1,
                z: 17,
                dir: 1
            }, {
                x: 0,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 0,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 0,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 0,
                y: 3,
                z: 15,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 16,
                dir: 2
            }, {
                x: 0,
                y: 3,
                z: 17,
                dir: 2
            }, {
                x: 1,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 1,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 1,
                y: 2,
                z: 17,
                dir: 3
            }, {
                x: 1,
                y: 3,
                z: 15,
                dir: 3
            }, {
                x: 1,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 2,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 2,
                y: 1,
                z: 13,
                dir: 1
            }, {
                x: 2,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 2,
                y: 1,
                z: 16,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 17,
                dir: 1
            }, {
                x: 2,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 2,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 2,
                y: 3,
                z: 0,
                dir: 1
            }, {
                x: 2,
                y: 3,
                z: 15,
                dir: 3
            }, {
                x: 2,
                y: 3,
                z: 16,
                dir: 2
            }, {
                x: 2,
                y: 3,
                z: 17,
                dir: 2
            }, {
                x: 2,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 13,
                dir: 3
            }, {
                x: 3,
                y: 1,
                z: 14,
                dir: 3
            }, {
                x: 3,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 3,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 3,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 3,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 3,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 4,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 4,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 4,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 4,
                y: 4,
                z: 1,
                dir: 2
            }, {
                x: 5,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 5,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 5,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 5,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 5,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 6,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 6,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 6,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 6,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 6,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 6,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 7,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 7,
                y: 1,
                z: 14,
                dir: 3
            }, {
                x: 7,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 7,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 7,
                y: 3,
                z: 0,
                dir: 1
            }, {
                x: 7,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 8,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 8,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 8,
                y: 3,
                z: 0,
                dir: 1
            }, {
                x: 8,
                y: 4,
                z: 0,
                dir: 3
            }, {
                x: 8,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 8,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 8,
                y: 5,
                z: 2,
                dir: 0
            }, {
                x: 8,
                y: 5,
                z: 3,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 9,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 9,
                y: 1,
                z: 2,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 16,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 9,
                y: 4,
                z: 0,
                dir: 3
            }, {
                x: 9,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 9,
                y: 5,
                z: 2,
                dir: 0
            }, {
                x: 9,
                y: 5,
                z: 3,
                dir: 1
            }, {
                x: 10,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 10,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 10,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 10,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 10,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 10,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 10,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 10,
                y: 5,
                z: 2,
                dir: 0
            }, {
                x: 10,
                y: 5,
                z: 3,
                dir: 1
            }, {
                x: 11,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 11,
                y: 3,
                z: 16,
                dir: 0
            }, {
                x: 11,
                y: 3,
                z: 17,
                dir: 1
            }, {
                x: 11,
                y: 4,
                z: 16,
                dir: 0
            }, {
                x: 11,
                y: 4,
                z: 17,
                dir: 2
            }, {
                x: 11,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 11,
                y: 5,
                z: 1,
                dir: 1
            }, {
                x: 11,
                y: 6,
                z: 0,
                dir: 1
            }, {
                x: 12,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 12,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 12,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 12,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 12,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 12,
                y: 4,
                z: 0,
                dir: 2
            }, {
                x: 12,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 12,
                y: 5,
                z: 1,
                dir: 1
            }, {
                x: 13,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 13,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 13,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 13,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 13,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 13,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 13,
                y: 5,
                z: 1,
                dir: 1
            }, {
                x: 14,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 14,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 14,
                y: 5,
                z: 1,
                dir: 1
            }, {
                x: 15,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 15,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 15,
                y: 1,
                z: 2,
                dir: 1
            }, {
                x: 15,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 15,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 15,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 15,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 15,
                y: 5,
                z: 2,
                dir: 1
            }, {
                x: 16,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 16,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 16,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 16,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 16,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 16,
                y: 4,
                z: 2,
                dir: 2
            }, {
                x: 16,
                y: 5,
                z: 0,
                dir: 1
            }, {
                x: 16,
                y: 5,
                z: 2,
                dir: 0
            }, {
                x: 16,
                y: 5,
                z: 3,
                dir: 1
            }, {
                x: 17,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 17,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 17,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 17,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 17,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 17,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 17,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 17,
                y: 5,
                z: 2,
                dir: 0
            }, {
                x: 17,
                y: 5,
                z: 3,
                dir: 1
            }, {
                x: 18,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 18,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 18,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 18,
                y: 1,
                z: 3,
                dir: 0
            }, {
                x: 18,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 18,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 18,
                y: 1,
                z: 6,
                dir: 1
            }, {
                x: 18,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 18,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 18,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 18,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 18,
                y: 5,
                z: 2,
                dir: 0
            }, {
                x: 18,
                y: 5,
                z: 3,
                dir: 0
            }, {
                x: 18,
                y: 5,
                z: 4,
                dir: 0
            }, {
                x: 18,
                y: 5,
                z: 5,
                dir: 1
            }, {
                x: 18,
                y: 5,
                z: 11,
                dir: 0
            }, {
                x: 18,
                y: 5,
                z: 12,
                dir: 0
            }, {
                x: 18,
                y: 5,
                z: 13,
                dir: 1
            }, {
                x: 18,
                y: 6,
                z: 0,
                dir: 1
            }, {
                x: 19,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 19,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 19,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 19,
                y: 1,
                z: 3,
                dir: 3
            }, {
                x: 19,
                y: 1,
                z: 4,
                dir: 3
            }, {
                x: 19,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 19,
                y: 1,
                z: 6,
                dir: 3
            }, {
                x: 19,
                y: 1,
                z: 7,
                dir: 1
            }, {
                x: 19,
                y: 1,
                z: 9,
                dir: 1
            }, {
                x: 19,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 19,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 19,
                y: 4,
                z: 5,
                dir: 1
            }, {
                x: 19,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 2,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 3,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 4,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 5,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 6,
                dir: 1
            }, {
                x: 19,
                y: 5,
                z: 11,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 12,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 13,
                dir: 1
            }, {
                x: 20,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 3,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 4,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 6,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 7,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 9,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 20,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 20,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 20,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 20,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 20,
                y: 5,
                z: 0,
                dir: 1
            }, {
                x: 20,
                y: 5,
                z: 2,
                dir: 0
            }, {
                x: 20,
                y: 5,
                z: 3,
                dir: 0
            }, {
                x: 20,
                y: 5,
                z: 4,
                dir: 0
            }, {
                x: 20,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 20,
                y: 5,
                z: 7,
                dir: 0
            }, {
                x: 20,
                y: 5,
                z: 8,
                dir: 1
            }, {
                x: 20,
                y: 5,
                z: 9,
                dir: 0
            }, {
                x: 20,
                y: 5,
                z: 10,
                dir: 0
            }, {
                x: 20,
                y: 5,
                z: 11,
                dir: 0
            }, {
                x: 20,
                y: 5,
                z: 13,
                dir: 1
            }, {
                x: 21,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 3,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 4,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 6,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 7,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 21,
                y: 1,
                z: 9,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 10,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 11,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 12,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 13,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 14,
                dir: 0
            }, {
                x: 21,
                y: 1,
                z: 15,
                dir: 0
            }, {
                x: 21,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 21,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 21,
                y: 4,
                z: 6,
                dir: 1
            }, {
                x: 21,
                y: 4,
                z: 10,
                dir: 1
            }, {
                x: 21,
                y: 4,
                z: 12,
                dir: 0
            }, {
                x: 21,
                y: 4,
                z: 13,
                dir: 2
            }, {
                x: 21,
                y: 4,
                z: 14,
                dir: 2
            }, {
                x: 21,
                y: 4,
                z: 15,
                dir: 2
            }, {
                x: 21,
                y: 4,
                z: 16,
                dir: 2
            }, {
                x: 21,
                y: 4,
                z: 17,
                dir: 2
            }, {
                x: 21,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 2,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 3,
                dir: 2
            }, {
                x: 21,
                y: 5,
                z: 4,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 5,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 7,
                dir: 2
            }, {
                x: 21,
                y: 5,
                z: 8,
                dir: 2
            }, {
                x: 21,
                y: 5,
                z: 9,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 10,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 11,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 12,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 13,
                dir: 2
            }, {
                x: 21,
                y: 6,
                z: 3,
                dir: 1
            }, {
                x: 21,
                y: 6,
                z: 10,
                dir: 1
            }],
            6: [{
                x: 20,
                y: 2,
                z: 12,
                dir: 0
            }]
        },
        3: {
            0: [{
                x: 3,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 8,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 10,
                dir: 0
            }]
        },
        4: {
            0: [{
                x: 1,
                y: 4,
                z: 15,
                dir: 3
            }, {
                x: 2,
                y: 4,
                z: 15,
                dir: 0
            }, {
                x: 2,
                y: 4,
                z: 16,
                dir: 3
            }, {
                x: 4,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 7,
                y: 3,
                z: 11,
                dir: 0
            }, {
                x: 8,
                y: 6,
                z: 3,
                dir: 0
            }, {
                x: 9,
                y: 3,
                z: 13,
                dir: 0
            }, {
                x: 10,
                y: 6,
                z: 3,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 13,
                dir: 0
            }, {
                x: 16,
                y: 3,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 3,
                z: 10,
                dir: 0
            }, {
                x: 16,
                y: 6,
                z: 3,
                dir: 0
            }, {
                x: 18,
                y: 6,
                z: 5,
                dir: 0
            }, {
                x: 18,
                y: 6,
                z: 11,
                dir: 0
            }, {
                x: 18,
                y: 6,
                z: 13,
                dir: 0
            }]
        },
        5: {
            0: [{
                x: 1,
                y: 1,
                z: 3,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 9,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 8,
                y: 1,
                z: 1,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 11,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 12,
                y: 3,
                z: 2,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 15,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 14,
                dir: 3
            }, {
                x: 17,
                y: 1,
                z: 14,
                dir: 3
            }, {
                x: 20,
                y: 3,
                z: 6,
                dir: 2
            }, {
                x: 20,
                y: 3,
                z: 10,
                dir: 0
            }, {
                x: 20,
                y: 4,
                z: 17,
                dir: 1
            }, {
                x: 21,
                y: 5,
                z: 14,
                dir: 2
            }]
        },
        6: {
            0: [{
                x: 0,
                y: 1,
                z: 11,
                dir: 1
            }, {
                x: 1,
                y: 1,
                z: 16,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 1,
                y: 3,
                z: 16,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 1,
                dir: 1
            }, {
                x: 2,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 2,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 3,
                y: 4,
                z: 1,
                dir: 2
            }, {
                x: 4,
                y: 1,
                z: 13,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 7,
                y: 5,
                z: 0,
                dir: 1
            }, {
                x: 8,
                y: 1,
                z: 16,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 9,
                y: 4,
                z: 1,
                dir: 2
            }, {
                x: 9,
                y: 5,
                z: 1,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 10,
                y: 3,
                z: 1,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 7,
                dir: 1
            }, {
                x: 11,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 14,
                y: 1,
                z: 2,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 14,
                y: 3,
                z: 15,
                dir: 0
            }, {
                x: 16,
                y: 1,
                z: 9,
                dir: 3
            }, {
                x: 16,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 16,
                y: 4,
                z: 1,
                dir: 0
            }, {
                x: 16,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 20,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 20,
                y: 1,
                z: 14,
                dir: 2
            }, {
                x: 20,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 14,
                dir: 2
            }, {
                x: 20,
                y: 3,
                z: 14,
                dir: 2
            }, {
                x: 20,
                y: 4,
                z: 5,
                dir: 3
            }, {
                x: 20,
                y: 4,
                z: 12,
                dir: 1
            }, {
                x: 20,
                y: 5,
                z: 5,
                dir: 3
            }, {
                x: 20,
                y: 5,
                z: 12,
                dir: 1
            }]
        },
        10: {
            0: [{
                x: 11,
                y: 5,
                z: 16,
                dir: 0
            }, {
                x: 11,
                y: 5,
                z: 17,
                dir: 0
            }, {
                x: 11,
                y: 7,
                z: 0,
                dir: 0
            }, {
                x: 18,
                y: 7,
                z: 0,
                dir: 0
            }, {
                x: 21,
                y: 7,
                z: 3,
                dir: 0
            }, {
                x: 21,
                y: 7,
                z: 10,
                dir: 0
            }]
        }
    },
    width: 22,
    height: 8,
    depth: 18,
    name: "",
    surfaceArea: 491
}, {
    data: {
        1: {
            0: [{
                x: 0,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 0,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 0,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 0,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 16,
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 17,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 18,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 19,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 11,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 12,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 14,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 16,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 17,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 18,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 19,
                dir: 3
            }, {
                x: 2,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 2,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 2,
                y: 0,
                z: 16,
                dir: 2
            }, {
                x: 2,
                y: 0,
                z: 17,
                dir: 2
            }, {
                x: 2,
                y: 0,
                z: 18,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 19,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 18,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 19,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 4,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 4,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 16,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 18,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 19,
                dir: 2
            }, {
                x: 5,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 5,
                y: 0,
                z: 18,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 19,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 18,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 19,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 18,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 19,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 18,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 19,
                dir: 3
            }, {
                x: 9,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 9,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 9,
                y: 0,
                z: 18,
                dir: 3
            }, {
                x: 9,
                y: 0,
                z: 19,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 10,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 18,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 19,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 18,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 19,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 12,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 16,
                dir: 2
            }, {
                x: 12,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 18,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 19,
                dir: 2
            }, {
                x: 13,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 13,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 13,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 18,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 19,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 18,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 19,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 15,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 18,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 19,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 16,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 16,
                y: 0,
                z: 18,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 19,
                dir: 1
            }, {
                x: 17,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 17,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 17,
                y: 0,
                z: 18,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 19,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 18,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 18,
                y: 0,
                z: 16,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 17,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 18,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 19,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 19,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 19,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 19,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 19,
                y: 0,
                z: 12,
                dir: 3
            }, {
                x: 19,
                y: 0,
                z: 13,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 19,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 17,
                dir: 1
            }, {
                x: 19,
                y: 0,
                z: 18,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 19,
                dir: 2
            }],
            1: [{
                x: 2,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 11,
                dir: 2
            }, {
                x: 2,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 12,
                dir: 2
            }, {
                x: 3,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 4,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 5,
                y: 0,
                z: 11,
                dir: 2
            }, {
                x: 5,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 6,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 7,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 7,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 14,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 16,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 8,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 8,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 8,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 11,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 13,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 14,
                dir: 3
            }, {
                x: 9,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 10,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 10,
                y: 0,
                z: 16,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 12,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 13,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 13,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 13,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 13,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 14,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 14,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 11,
                dir: 2
            }, {
                x: 14,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 14,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 16,
                dir: 2
            }, {
                x: 15,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 15,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 15,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 16,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 14,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 16,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 17,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 17,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 17,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 17,
                y: 0,
                z: 16,
                dir: 2
            }, {
                x: 18,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 11,
                dir: 1
            }]
        },
        2: {
            1: [{
                x: 4,
                y: 3,
                z: 11,
                dir: 3
            }, {
                x: 4,
                y: 3,
                z: 13,
                dir: 1
            }, {
                x: 5,
                y: 3,
                z: 11,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 13,
                dir: 2
            }, {
                x: 6,
                y: 3,
                z: 11,
                dir: 1
            }, {
                x: 6,
                y: 3,
                z: 13,
                dir: 3
            }, {
                x: 7,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 7,
                y: 3,
                z: 3,
                dir: 2
            }, {
                x: 8,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 8,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 15,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 7,
                dir: 3
            }, {
                x: 15,
                y: 3,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 1,
                z: 1,
                dir: 3
            }],
            5: [{
                x: 0,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 0,
                y: 1,
                z: 3,
                dir: 1
            }, {
                x: 0,
                y: 1,
                z: 4,
                dir: 1
            }, {
                x: 0,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 1,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 1,
                y: 1,
                z: 3,
                dir: 3
            }, {
                x: 1,
                y: 1,
                z: 4,
                dir: 3
            }, {
                x: 1,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 2,
                y: 1,
                z: 2,
                dir: 1
            }, {
                x: 2,
                y: 1,
                z: 5,
                dir: 2
            }, {
                x: 2,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 9,
                dir: 3
            }, {
                x: 2,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 11,
                dir: 3
            }, {
                x: 2,
                y: 1,
                z: 13,
                dir: 3
            }, {
                x: 2,
                y: 1,
                z: 14,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 10,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 2,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 2,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 3,
                dir: 3
            }, {
                x: 3,
                y: 1,
                z: 4,
                dir: 3
            }, {
                x: 3,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 3,
                y: 1,
                z: 7,
                dir: 2
            }, {
                x: 3,
                y: 1,
                z: 9,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 10,
                dir: 3
            }, {
                x: 3,
                y: 1,
                z: 14,
                dir: 2
            }, {
                x: 3,
                y: 1,
                z: 15,
                dir: 0
            }, {
                x: 3,
                y: 1,
                z: 16,
                dir: 2
            }, {
                x: 3,
                y: 1,
                z: 17,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 3,
                y: 2,
                z: 14,
                dir: 3
            }, {
                x: 4,
                y: 1,
                z: 2,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 4,
                y: 1,
                z: 7,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 17,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 4,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 4,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 14,
                dir: 3
            }, {
                x: 5,
                y: 1,
                z: 0,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 1,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 2,
                dir: 2
            }, {
                x: 5,
                y: 1,
                z: 3,
                dir: 2
            }, {
                x: 5,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 5,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 6,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 7,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 15,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 16,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 17,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 5,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 5,
                y: 2,
                z: 14,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 6,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 7,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 5,
                y: 4,
                z: 6,
                dir: 2
            }, {
                x: 5,
                y: 4,
                z: 7,
                dir: 2
            }, {
                x: 5,
                y: 4,
                z: 8,
                dir: 2
            }, {
                x: 6,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 6,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 6,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 6,
                y: 1,
                z: 17,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 13,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 6,
                y: 3,
                z: 6,
                dir: 2
            }, {
                x: 6,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 6,
                y: 4,
                z: 6,
                dir: 2
            }, {
                x: 6,
                y: 4,
                z: 8,
                dir: 2
            }, {
                x: 7,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 7,
                y: 1,
                z: 7,
                dir: 3
            }, {
                x: 7,
                y: 1,
                z: 17,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 7,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 7,
                y: 3,
                z: 6,
                dir: 2
            }, {
                x: 7,
                y: 3,
                z: 7,
                dir: 2
            }, {
                x: 7,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 7,
                y: 4,
                z: 6,
                dir: 2
            }, {
                x: 7,
                y: 4,
                z: 7,
                dir: 2
            }, {
                x: 7,
                y: 4,
                z: 8,
                dir: 2
            }, {
                x: 8,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 8,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 8,
                y: 1,
                z: 6,
                dir: 2
            }, {
                x: 8,
                y: 1,
                z: 7,
                dir: 3
            }, {
                x: 8,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 8,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 8,
                y: 1,
                z: 17,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 0,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 10,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 13,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 1,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 2,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 8,
                dir: 2
            }, {
                x: 9,
                y: 1,
                z: 9,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 10,
                dir: 3
            }, {
                x: 9,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 17,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 0,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 2,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 10,
                y: 1,
                z: 0,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 1,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 2,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 7,
                dir: 2
            }, {
                x: 10,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 0,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 2,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 12,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 0,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 1,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 6,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 8,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 9,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 11,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 13,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 11,
                y: 1,
                z: 15,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 16,
                dir: 1
            }, {
                x: 11,
                y: 1,
                z: 17,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 0,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 11,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 12,
                y: 1,
                z: 1,
                dir: 1
            }, {
                x: 12,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 7,
                dir: 1
            }, {
                x: 12,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 13,
                dir: 1
            }, {
                x: 12,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 12,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 12,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 1,
                dir: 2
            }, {
                x: 13,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 13,
                y: 1,
                z: 9,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 10,
                dir: 3
            }, {
                x: 13,
                y: 1,
                z: 11,
                dir: 1
            }, {
                x: 13,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 13,
                dir: 1
            }, {
                x: 13,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 12,
                dir: 2
            }, {
                x: 14,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 2,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 3,
                dir: 1
            }, {
                x: 14,
                y: 1,
                z: 4,
                dir: 2
            }, {
                x: 14,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 14,
                y: 1,
                z: 17,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 14,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 10,
                dir: 3
            }, {
                x: 14,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 13,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 16,
                dir: 2
            }, {
                x: 15,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 15,
                y: 1,
                z: 13,
                dir: 1
            }, {
                x: 15,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 15,
                y: 1,
                z: 17,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 13,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 14,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 16,
                y: 1,
                z: 4,
                dir: 2
            }, {
                x: 16,
                y: 1,
                z: 8,
                dir: 2
            }, {
                x: 16,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 16,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 16,
                dir: 3
            }, {
                x: 16,
                y: 2,
                z: 17,
                dir: 3
            }, {
                x: 17,
                y: 1,
                z: 4,
                dir: 3
            }, {
                x: 17,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 17,
                y: 1,
                z: 7,
                dir: 3
            }, {
                x: 17,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 17,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 17,
                y: 1,
                z: 13,
                dir: 1
            }, {
                x: 17,
                y: 1,
                z: 14,
                dir: 3
            }, {
                x: 17,
                y: 1,
                z: 16,
                dir: 0
            }, {
                x: 17,
                y: 1,
                z: 17,
                dir: 1
            }, {
                x: 17,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 17,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 17,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 17,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 10,
                dir: 3
            }, {
                x: 17,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 17,
                y: 2,
                z: 13,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 17,
                dir: 2
            }, {
                x: 18,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 1,
                z: 12,
                dir: 0
            }]
        },
        4: {
            0: [{
                x: 1,
                y: 1,
                z: 16,
                dir: 1
            }, {
                x: 1,
                y: 1,
                z: 18,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 10,
                dir: 1
            }, {
                x: 5,
                y: 3,
                z: 14,
                dir: 1
            }, {
                x: 5,
                y: 5,
                z: 6,
                dir: 2
            }, {
                x: 5,
                y: 5,
                z: 8,
                dir: 2
            }, {
                x: 7,
                y: 4,
                z: 3,
                dir: 2
            }, {
                x: 7,
                y: 5,
                z: 6,
                dir: 2
            }, {
                x: 7,
                y: 5,
                z: 8,
                dir: 2
            }, {
                x: 8,
                y: 1,
                z: 18,
                dir: 1
            }, {
                x: 9,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 10,
                y: 1,
                z: 18,
                dir: 1
            }, {
                x: 10,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 10,
                y: 3,
                z: 4,
                dir: 1
            }, {
                x: 11,
                y: 3,
                z: 9,
                dir: 2
            }, {
                x: 11,
                y: 3,
                z: 12,
                dir: 1
            }, {
                x: 13,
                y: 3,
                z: 4,
                dir: 2
            }, {
                x: 15,
                y: 3,
                z: 5,
                dir: 2
            }, {
                x: 15,
                y: 3,
                z: 9,
                dir: 2
            }, {
                x: 15,
                y: 3,
                z: 10,
                dir: 2
            }, {
                x: 15,
                y: 3,
                z: 11,
                dir: 2
            }, {
                x: 15,
                y: 3,
                z: 12,
                dir: 2
            }, {
                x: 17,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 18,
                y: 1,
                z: 18,
                dir: 3
            }, {
                x: 18,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 18,
                y: 2,
                z: 12,
                dir: 2
            }]
        },
        5: {
            0: [{
                x: 0,
                y: 1,
                z: 1,
                dir: 0
            }, {
                x: 4,
                y: 1,
                z: 1,
                dir: 0
            }, {
                x: 4,
                y: 1,
                z: 5,
                dir: 2
            }, {
                x: 4,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 16,
                dir: 0
            }, {
                x: 4,
                y: 1,
                z: 18,
                dir: 2
            }, {
                x: 4,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 5,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 8,
                y: 3,
                z: 1,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 8,
                dir: 2
            }, {
                x: 10,
                y: 1,
                z: 15,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 10,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 13,
                dir: 2
            }, {
                x: 14,
                y: 1,
                z: 18,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 17,
                dir: 2
            }, {
                x: 16,
                y: 1,
                z: 13,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 12,
                dir: 2
            }]
        },
        6: {
            0: [{
                x: 6,
                y: 1,
                z: 7,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 6,
                y: 3,
                z: 7,
                dir: 1
            }, {
                x: 6,
                y: 4,
                z: 7,
                dir: 1
            }]
        }
    },
    width: 20,
    height: 6,
    depth: 20,
    name: "",
    surfaceArea: 440
}, {
    data: {
        1: {
            0: [{
                x: 0,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 0,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 2,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 2,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 2,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 2,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 3,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 3,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 3,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 3,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 4,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 5,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 5,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 5,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 5,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 6,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 6,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 6,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 6,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 7,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 7,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 7,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 8,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 8,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 8,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 8,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 8,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 8,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 8,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 9,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 9,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 9,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 9,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 11,
                dir: 2
            }, {
                x: 10,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 2,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 10,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 10,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 10,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 13,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 13,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 13,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 13,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 13,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 13,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 14,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 15,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 15,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 16,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 17,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 17,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 17,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 17,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 18,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 18,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 4,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 18,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 18,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 19,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 19,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 19,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 19,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 19,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 19,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 19,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 20,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 20,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 20,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 20,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 21,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 21,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 21,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 21,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 21,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 21,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 21,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 21,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 22,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 22,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 22,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 22,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 22,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 22,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 22,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 23,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 23,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 23,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 23,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 23,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 23,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 23,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 23,
                y: 0,
                z: 7,
                dir: 0
            }, {
                x: 23,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 23,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 23,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 23,
                y: 0,
                z: 11,
                dir: 2
            }]
        },
        2: {
            6: [{
                x: 0,
                y: 1,
                z: 1,
                dir: 1
            }, {
                x: 0,
                y: 1,
                z: 2,
                dir: 0
            }, {
                x: 0,
                y: 1,
                z: 3,
                dir: 2
            }, {
                x: 0,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 0,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 0,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 0,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 1,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 2,
                dir: 3
            }, {
                x: 1,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 2,
                y: 1,
                z: 1,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 5,
                dir: 2
            }, {
                x: 2,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 7,
                dir: 1
            }, {
                x: 2,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 9,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 10,
                dir: 2
            }, {
                x: 2,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 2,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 2,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 2,
                y: 3,
                z: 6,
                dir: 3
            }, {
                x: 2,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 2,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 2,
                y: 3,
                z: 9,
                dir: 1
            }, {
                x: 2,
                y: 3,
                z: 10,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 1,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 2,
                dir: 0
            }, {
                x: 3,
                y: 1,
                z: 5,
                dir: 1
            }, {
                x: 3,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 3,
                y: 3,
                z: 1,
                dir: 0
            }, {
                x: 3,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 3,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 3,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 3,
                y: 3,
                z: 5,
                dir: 1
            }, {
                x: 3,
                y: 3,
                z: 6,
                dir: 2
            }, {
                x: 3,
                y: 3,
                z: 7,
                dir: 1
            }, {
                x: 3,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 3,
                y: 3,
                z: 9,
                dir: 2
            }, {
                x: 3,
                y: 3,
                z: 10,
                dir: 0
            }, {
                x: 3,
                y: 4,
                z: 1,
                dir: 1
            }, {
                x: 3,
                y: 4,
                z: 2,
                dir: 2
            }, {
                x: 4,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 4,
                y: 1,
                z: 1,
                dir: 0
            }, {
                x: 4,
                y: 1,
                z: 2,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 5,
                dir: 2
            }, {
                x: 4,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 4,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 4,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 4,
                y: 3,
                z: 1,
                dir: 2
            }, {
                x: 4,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 4,
                y: 3,
                z: 3,
                dir: 0
            }, {
                x: 4,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 4,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 4,
                y: 3,
                z: 6,
                dir: 1
            }, {
                x: 4,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 4,
                y: 3,
                z: 9,
                dir: 1
            }, {
                x: 4,
                y: 3,
                z: 10,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 1,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 2,
                dir: 1
            }, {
                x: 4,
                y: 4,
                z: 5,
                dir: 1
            }, {
                x: 4,
                y: 4,
                z: 6,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 7,
                dir: 0
            }, {
                x: 4,
                y: 4,
                z: 8,
                dir: 3
            }, {
                x: 4,
                y: 4,
                z: 9,
                dir: 2
            }, {
                x: 4,
                y: 5,
                z: 5,
                dir: 0
            }, {
                x: 4,
                y: 5,
                z: 7,
                dir: 1
            }, {
                x: 4,
                y: 5,
                z: 8,
                dir: 2
            }, {
                x: 4,
                y: 5,
                z: 9,
                dir: 1
            }, {
                x: 4,
                y: 6,
                z: 5,
                dir: 3
            }, {
                x: 4,
                y: 6,
                z: 6,
                dir: 3
            }, {
                x: 4,
                y: 6,
                z: 7,
                dir: 1
            }, {
                x: 4,
                y: 6,
                z: 8,
                dir: 1
            }, {
                x: 4,
                y: 6,
                z: 9,
                dir: 2
            }, {
                x: 4,
                y: 7,
                z: 5,
                dir: 1
            }, {
                x: 4,
                y: 7,
                z: 9,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 0,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 5,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 9,
                dir: 3
            }, {
                x: 5,
                y: 1,
                z: 10,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 5,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 5,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 5,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 5,
                y: 3,
                z: 1,
                dir: 0
            }, {
                x: 5,
                y: 3,
                z: 2,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 3,
                dir: 1
            }, {
                x: 5,
                y: 3,
                z: 9,
                dir: 3
            }, {
                x: 5,
                y: 3,
                z: 10,
                dir: 2
            }, {
                x: 5,
                y: 4,
                z: 1,
                dir: 0
            }, {
                x: 5,
                y: 4,
                z: 2,
                dir: 2
            }, {
                x: 5,
                y: 4,
                z: 3,
                dir: 0
            }, {
                x: 5,
                y: 4,
                z: 5,
                dir: 3
            }, {
                x: 5,
                y: 4,
                z: 6,
                dir: 1
            }, {
                x: 5,
                y: 4,
                z: 7,
                dir: 0
            }, {
                x: 5,
                y: 4,
                z: 8,
                dir: 3
            }, {
                x: 5,
                y: 4,
                z: 9,
                dir: 2
            }, {
                x: 5,
                y: 5,
                z: 5,
                dir: 2
            }, {
                x: 5,
                y: 5,
                z: 9,
                dir: 1
            }, {
                x: 5,
                y: 6,
                z: 5,
                dir: 3
            }, {
                x: 5,
                y: 6,
                z: 6,
                dir: 1
            }, {
                x: 5,
                y: 6,
                z: 7,
                dir: 3
            }, {
                x: 5,
                y: 6,
                z: 9,
                dir: 2
            }, {
                x: 5,
                y: 7,
                z: 5,
                dir: 0
            }, {
                x: 5,
                y: 7,
                z: 9,
                dir: 1
            }, {
                x: 6,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 6,
                y: 1,
                z: 1,
                dir: 2
            }, {
                x: 6,
                y: 1,
                z: 5,
                dir: 2
            }, {
                x: 6,
                y: 1,
                z: 9,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 6,
                y: 3,
                z: 1,
                dir: 0
            }, {
                x: 6,
                y: 3,
                z: 9,
                dir: 3
            }, {
                x: 6,
                y: 4,
                z: 1,
                dir: 0
            }, {
                x: 6,
                y: 4,
                z: 2,
                dir: 0
            }, {
                x: 6,
                y: 4,
                z: 3,
                dir: 2
            }, {
                x: 6,
                y: 4,
                z: 5,
                dir: 3
            }, {
                x: 6,
                y: 4,
                z: 6,
                dir: 0
            }, {
                x: 6,
                y: 4,
                z: 7,
                dir: 2
            }, {
                x: 6,
                y: 4,
                z: 8,
                dir: 2
            }, {
                x: 6,
                y: 4,
                z: 9,
                dir: 2
            }, {
                x: 6,
                y: 5,
                z: 5,
                dir: 1
            }, {
                x: 6,
                y: 5,
                z: 9,
                dir: 2
            }, {
                x: 6,
                y: 6,
                z: 5,
                dir: 1
            }, {
                x: 6,
                y: 6,
                z: 6,
                dir: 1
            }, {
                x: 6,
                y: 6,
                z: 7,
                dir: 2
            }, {
                x: 6,
                y: 6,
                z: 9,
                dir: 2
            }, {
                x: 6,
                y: 7,
                z: 5,
                dir: 2
            }, {
                x: 6,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 7,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 7,
                y: 1,
                z: 1,
                dir: 2
            }, {
                x: 7,
                y: 1,
                z: 5,
                dir: 1
            }, {
                x: 7,
                y: 1,
                z: 9,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 7,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 7,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 7,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 7,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 7,
                y: 4,
                z: 1,
                dir: 0
            }, {
                x: 7,
                y: 4,
                z: 2,
                dir: 3
            }, {
                x: 7,
                y: 4,
                z: 3,
                dir: 2
            }, {
                x: 7,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 7,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 7,
                y: 4,
                z: 6,
                dir: 1
            }, {
                x: 7,
                y: 4,
                z: 7,
                dir: 1
            }, {
                x: 7,
                y: 4,
                z: 8,
                dir: 1
            }, {
                x: 7,
                y: 4,
                z: 9,
                dir: 3
            }, {
                x: 7,
                y: 5,
                z: 8,
                dir: 2
            }, {
                x: 7,
                y: 5,
                z: 9,
                dir: 1
            }, {
                x: 7,
                y: 6,
                z: 5,
                dir: 2
            }, {
                x: 7,
                y: 6,
                z: 6,
                dir: 0
            }, {
                x: 7,
                y: 6,
                z: 7,
                dir: 2
            }, {
                x: 7,
                y: 6,
                z: 9,
                dir: 2
            }, {
                x: 7,
                y: 7,
                z: 5,
                dir: 3
            }, {
                x: 7,
                y: 7,
                z: 9,
                dir: 3
            }, {
                x: 8,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 8,
                y: 1,
                z: 1,
                dir: 2
            }, {
                x: 8,
                y: 1,
                z: 2,
                dir: 1
            }, {
                x: 8,
                y: 1,
                z: 3,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 8,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 8,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 8,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 8,
                y: 3,
                z: 4,
                dir: 0
            }, {
                x: 8,
                y: 3,
                z: 9,
                dir: 3
            }, {
                x: 8,
                y: 4,
                z: 1,
                dir: 2
            }, {
                x: 8,
                y: 4,
                z: 2,
                dir: 0
            }, {
                x: 8,
                y: 4,
                z: 3,
                dir: 0
            }, {
                x: 8,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 8,
                y: 4,
                z: 5,
                dir: 2
            }, {
                x: 8,
                y: 4,
                z: 6,
                dir: 3
            }, {
                x: 8,
                y: 4,
                z: 7,
                dir: 0
            }, {
                x: 8,
                y: 4,
                z: 8,
                dir: 0
            }, {
                x: 8,
                y: 4,
                z: 9,
                dir: 1
            }, {
                x: 8,
                y: 5,
                z: 5,
                dir: 3
            }, {
                x: 8,
                y: 5,
                z: 8,
                dir: 0
            }, {
                x: 8,
                y: 5,
                z: 9,
                dir: 3
            }, {
                x: 8,
                y: 6,
                z: 5,
                dir: 2
            }, {
                x: 8,
                y: 6,
                z: 6,
                dir: 3
            }, {
                x: 8,
                y: 6,
                z: 7,
                dir: 1
            }, {
                x: 8,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 8,
                y: 6,
                z: 9,
                dir: 0
            }, {
                x: 8,
                y: 7,
                z: 5,
                dir: 2
            }, {
                x: 8,
                y: 7,
                z: 9,
                dir: 3
            }, {
                x: 9,
                y: 1,
                z: 0,
                dir: 2
            }, {
                x: 9,
                y: 1,
                z: 1,
                dir: 2
            }, {
                x: 9,
                y: 1,
                z: 2,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 3,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 7,
                dir: 3
            }, {
                x: 9,
                y: 1,
                z: 8,
                dir: 3
            }, {
                x: 9,
                y: 1,
                z: 9,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 2,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 9,
                y: 3,
                z: 7,
                dir: 1
            }, {
                x: 9,
                y: 3,
                z: 8,
                dir: 1
            }, {
                x: 9,
                y: 3,
                z: 9,
                dir: 3
            }, {
                x: 9,
                y: 4,
                z: 4,
                dir: 3
            }, {
                x: 9,
                y: 4,
                z: 5,
                dir: 1
            }, {
                x: 9,
                y: 4,
                z: 6,
                dir: 2
            }, {
                x: 9,
                y: 4,
                z: 7,
                dir: 0
            }, {
                x: 9,
                y: 4,
                z: 8,
                dir: 2
            }, {
                x: 9,
                y: 4,
                z: 9,
                dir: 2
            }, {
                x: 9,
                y: 5,
                z: 5,
                dir: 1
            }, {
                x: 9,
                y: 5,
                z: 6,
                dir: 3
            }, {
                x: 9,
                y: 5,
                z: 8,
                dir: 2
            }, {
                x: 9,
                y: 5,
                z: 9,
                dir: 1
            }, {
                x: 9,
                y: 6,
                z: 5,
                dir: 0
            }, {
                x: 9,
                y: 6,
                z: 6,
                dir: 1
            }, {
                x: 9,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 9,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 9,
                y: 6,
                z: 9,
                dir: 1
            }, {
                x: 9,
                y: 7,
                z: 5,
                dir: 0
            }, {
                x: 9,
                y: 7,
                z: 6,
                dir: 3
            }, {
                x: 9,
                y: 7,
                z: 7,
                dir: 1
            }, {
                x: 9,
                y: 7,
                z: 8,
                dir: 2
            }, {
                x: 9,
                y: 7,
                z: 9,
                dir: 3
            }, {
                x: 10,
                y: 1,
                z: 0,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 1,
                dir: 2
            }, {
                x: 10,
                y: 1,
                z: 2,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 10,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 10,
                y: 4,
                z: 5,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 0,
                dir: 3
            }, {
                x: 11,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 11,
                y: 3,
                z: 0,
                dir: 3
            }, {
                x: 11,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 11,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 11,
                y: 3,
                z: 7,
                dir: 1
            }, {
                x: 11,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 11,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 11,
                y: 4,
                z: 1,
                dir: 3
            }, {
                x: 11,
                y: 4,
                z: 2,
                dir: 1
            }, {
                x: 11,
                y: 4,
                z: 3,
                dir: 0
            }, {
                x: 11,
                y: 4,
                z: 4,
                dir: 3
            }, {
                x: 11,
                y: 4,
                z: 5,
                dir: 3
            }, {
                x: 11,
                y: 4,
                z: 6,
                dir: 1
            }, {
                x: 11,
                y: 4,
                z: 7,
                dir: 3
            }, {
                x: 11,
                y: 4,
                z: 8,
                dir: 1
            }, {
                x: 11,
                y: 5,
                z: 0,
                dir: 3
            }, {
                x: 11,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 11,
                y: 5,
                z: 3,
                dir: 3
            }, {
                x: 11,
                y: 5,
                z: 4,
                dir: 3
            }, {
                x: 11,
                y: 6,
                z: 0,
                dir: 1
            }, {
                x: 11,
                y: 6,
                z: 1,
                dir: 2
            }, {
                x: 11,
                y: 6,
                z: 2,
                dir: 3
            }, {
                x: 11,
                y: 6,
                z: 3,
                dir: 2
            }, {
                x: 11,
                y: 6,
                z: 4,
                dir: 0
            }, {
                x: 11,
                y: 7,
                z: 0,
                dir: 0
            }, {
                x: 11,
                y: 7,
                z: 1,
                dir: 3
            }, {
                x: 11,
                y: 7,
                z: 3,
                dir: 3
            }, {
                x: 11,
                y: 7,
                z: 4,
                dir: 3
            }, {
                x: 11,
                y: 8,
                z: 0,
                dir: 3
            }, {
                x: 11,
                y: 8,
                z: 1,
                dir: 2
            }, {
                x: 11,
                y: 8,
                z: 2,
                dir: 3
            }, {
                x: 11,
                y: 8,
                z: 3,
                dir: 1
            }, {
                x: 11,
                y: 8,
                z: 4,
                dir: 0
            }, {
                x: 11,
                y: 8,
                z: 5,
                dir: 3
            }, {
                x: 11,
                y: 8,
                z: 6,
                dir: 2
            }, {
                x: 11,
                y: 8,
                z: 7,
                dir: 1
            }, {
                x: 12,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 12,
                y: 1,
                z: 8,
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 12,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 12,
                y: 3,
                z: 0,
                dir: 2
            }, {
                x: 12,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 12,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 12,
                y: 4,
                z: 1,
                dir: 0
            }, {
                x: 12,
                y: 4,
                z: 2,
                dir: 1
            }, {
                x: 12,
                y: 4,
                z: 3,
                dir: 2
            }, {
                x: 12,
                y: 4,
                z: 4,
                dir: 0
            }, {
                x: 12,
                y: 4,
                z: 5,
                dir: 3
            }, {
                x: 12,
                y: 4,
                z: 6,
                dir: 0
            }, {
                x: 12,
                y: 4,
                z: 7,
                dir: 2
            }, {
                x: 12,
                y: 4,
                z: 8,
                dir: 2
            }, {
                x: 12,
                y: 5,
                z: 0,
                dir: 2
            }, {
                x: 12,
                y: 5,
                z: 4,
                dir: 3
            }, {
                x: 12,
                y: 6,
                z: 0,
                dir: 2
            }, {
                x: 12,
                y: 6,
                z: 1,
                dir: 0
            }, {
                x: 12,
                y: 6,
                z: 2,
                dir: 0
            }, {
                x: 12,
                y: 6,
                z: 3,
                dir: 1
            }, {
                x: 12,
                y: 6,
                z: 4,
                dir: 2
            }, {
                x: 12,
                y: 7,
                z: 0,
                dir: 2
            }, {
                x: 12,
                y: 7,
                z: 4,
                dir: 2
            }, {
                x: 12,
                y: 8,
                z: 0,
                dir: 0
            }, {
                x: 12,
                y: 8,
                z: 1,
                dir: 0
            }, {
                x: 12,
                y: 8,
                z: 2,
                dir: 3
            }, {
                x: 12,
                y: 8,
                z: 3,
                dir: 0
            }, {
                x: 12,
                y: 8,
                z: 4,
                dir: 1
            }, {
                x: 12,
                y: 8,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 8,
                z: 6,
                dir: 3
            }, {
                x: 12,
                y: 8,
                z: 7,
                dir: 1
            }, {
                x: 13,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 13,
                y: 1,
                z: 4,
                dir: 1
            }, {
                x: 13,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 13,
                y: 1,
                z: 6,
                dir: 1
            }, {
                x: 13,
                y: 1,
                z: 8,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 0,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 13,
                y: 3,
                z: 0,
                dir: 1
            }, {
                x: 13,
                y: 3,
                z: 8,
                dir: 1
            }, {
                x: 13,
                y: 4,
                z: 0,
                dir: 2
            }, {
                x: 13,
                y: 4,
                z: 1,
                dir: 3
            }, {
                x: 13,
                y: 4,
                z: 2,
                dir: 1
            }, {
                x: 13,
                y: 4,
                z: 3,
                dir: 0
            }, {
                x: 13,
                y: 4,
                z: 5,
                dir: 3
            }, {
                x: 13,
                y: 4,
                z: 6,
                dir: 1
            }, {
                x: 13,
                y: 4,
                z: 7,
                dir: 0
            }, {
                x: 13,
                y: 4,
                z: 8,
                dir: 1
            }, {
                x: 13,
                y: 5,
                z: 0,
                dir: 3
            }, {
                x: 13,
                y: 5,
                z: 1,
                dir: 1
            }, {
                x: 13,
                y: 5,
                z: 8,
                dir: 2
            }, {
                x: 13,
                y: 6,
                z: 0,
                dir: 2
            }, {
                x: 13,
                y: 6,
                z: 1,
                dir: 1
            }, {
                x: 13,
                y: 6,
                z: 3,
                dir: 3
            }, {
                x: 13,
                y: 6,
                z: 4,
                dir: 3
            }, {
                x: 13,
                y: 6,
                z: 9,
                dir: 3
            }, {
                x: 13,
                y: 7,
                z: 0,
                dir: 1
            }, {
                x: 13,
                y: 7,
                z: 4,
                dir: 2
            }, {
                x: 13,
                y: 8,
                z: 0,
                dir: 1
            }, {
                x: 13,
                y: 8,
                z: 1,
                dir: 0
            }, {
                x: 13,
                y: 8,
                z: 2,
                dir: 2
            }, {
                x: 13,
                y: 8,
                z: 3,
                dir: 1
            }, {
                x: 13,
                y: 8,
                z: 4,
                dir: 1
            }, {
                x: 13,
                y: 8,
                z: 5,
                dir: 2
            }, {
                x: 13,
                y: 8,
                z: 6,
                dir: 1
            }, {
                x: 13,
                y: 8,
                z: 7,
                dir: 0
            }, {
                x: 13,
                y: 10,
                z: 3,
                dir: 1
            }, {
                x: 13,
                y: 10,
                z: 4,
                dir: 2
            }, {
                x: 13,
                y: 10,
                z: 5,
                dir: 0
            }, {
                x: 13,
                y: 10,
                z: 6,
                dir: 1
            }, {
                x: 13,
                y: 10,
                z: 7,
                dir: 0
            }, {
                x: 13,
                y: 10,
                z: 8,
                dir: 1
            }, {
                x: 13,
                y: 10,
                z: 9,
                dir: 3
            }, {
                x: 13,
                y: 11,
                z: 3,
                dir: 1
            }, {
                x: 13,
                y: 11,
                z: 9,
                dir: 1
            }, {
                x: 14,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 4,
                dir: 1
            }, {
                x: 14,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 6,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 7,
                dir: 2
            }, {
                x: 14,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 0,
                dir: 3
            }, {
                x: 14,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 14,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 14,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 14,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 14,
                y: 3,
                z: 4,
                dir: 2
            }, {
                x: 14,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 14,
                y: 4,
                z: 0,
                dir: 2
            }, {
                x: 14,
                y: 4,
                z: 1,
                dir: 1
            }, {
                x: 14,
                y: 4,
                z: 2,
                dir: 0
            }, {
                x: 14,
                y: 4,
                z: 3,
                dir: 2
            }, {
                x: 14,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 14,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 14,
                y: 4,
                z: 6,
                dir: 3
            }, {
                x: 14,
                y: 4,
                z: 7,
                dir: 2
            }, {
                x: 14,
                y: 4,
                z: 8,
                dir: 3
            }, {
                x: 14,
                y: 5,
                z: 0,
                dir: 2
            }, {
                x: 14,
                y: 5,
                z: 7,
                dir: 3
            }, {
                x: 14,
                y: 5,
                z: 8,
                dir: 2
            }, {
                x: 14,
                y: 6,
                z: 0,
                dir: 1
            }, {
                x: 14,
                y: 6,
                z: 1,
                dir: 2
            }, {
                x: 14,
                y: 6,
                z: 2,
                dir: 0
            }, {
                x: 14,
                y: 6,
                z: 3,
                dir: 1
            }, {
                x: 14,
                y: 6,
                z: 4,
                dir: 3
            }, {
                x: 14,
                y: 6,
                z: 5,
                dir: 2
            }, {
                x: 14,
                y: 6,
                z: 6,
                dir: 3
            }, {
                x: 14,
                y: 6,
                z: 7,
                dir: 3
            }, {
                x: 14,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 6,
                z: 9,
                dir: 2
            }, {
                x: 14,
                y: 7,
                z: 0,
                dir: 1
            }, {
                x: 14,
                y: 7,
                z: 4,
                dir: 3
            }, {
                x: 14,
                y: 7,
                z: 5,
                dir: 0
            }, {
                x: 14,
                y: 7,
                z: 6,
                dir: 3
            }, {
                x: 14,
                y: 7,
                z: 7,
                dir: 3
            }, {
                x: 14,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 8,
                z: 0,
                dir: 0
            }, {
                x: 14,
                y: 8,
                z: 1,
                dir: 2
            }, {
                x: 14,
                y: 8,
                z: 2,
                dir: 0
            }, {
                x: 14,
                y: 8,
                z: 3,
                dir: 0
            }, {
                x: 14,
                y: 8,
                z: 4,
                dir: 3
            }, {
                x: 14,
                y: 8,
                z: 5,
                dir: 0
            }, {
                x: 14,
                y: 8,
                z: 6,
                dir: 0
            }, {
                x: 14,
                y: 8,
                z: 7,
                dir: 0
            }, {
                x: 14,
                y: 8,
                z: 8,
                dir: 1
            }, {
                x: 14,
                y: 9,
                z: 4,
                dir: 0
            }, {
                x: 14,
                y: 9,
                z: 5,
                dir: 1
            }, {
                x: 14,
                y: 9,
                z: 7,
                dir: 3
            }, {
                x: 14,
                y: 9,
                z: 8,
                dir: 3
            }, {
                x: 14,
                y: 10,
                z: 3,
                dir: 1
            }, {
                x: 14,
                y: 10,
                z: 4,
                dir: 0
            }, {
                x: 14,
                y: 10,
                z: 5,
                dir: 3
            }, {
                x: 14,
                y: 10,
                z: 6,
                dir: 2
            }, {
                x: 14,
                y: 10,
                z: 7,
                dir: 0
            }, {
                x: 14,
                y: 10,
                z: 8,
                dir: 2
            }, {
                x: 14,
                y: 10,
                z: 9,
                dir: 2
            }, {
                x: 15,
                y: 1,
                z: 0,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 1,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 2,
                dir: 2
            }, {
                x: 15,
                y: 1,
                z: 4,
                dir: 2
            }, {
                x: 15,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 6,
                dir: 1
            }, {
                x: 15,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 8,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 0,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 15,
                y: 3,
                z: 0,
                dir: 1
            }, {
                x: 15,
                y: 3,
                z: 1,
                dir: 1
            }, {
                x: 15,
                y: 3,
                z: 2,
                dir: 2
            }, {
                x: 15,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 15,
                y: 3,
                z: 4,
                dir: 1
            }, {
                x: 15,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 15,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 15,
                y: 4,
                z: 1,
                dir: 1
            }, {
                x: 15,
                y: 4,
                z: 2,
                dir: 2
            }, {
                x: 15,
                y: 4,
                z: 3,
                dir: 3
            }, {
                x: 15,
                y: 4,
                z: 4,
                dir: 3
            }, {
                x: 15,
                y: 4,
                z: 8,
                dir: 0
            }, {
                x: 15,
                y: 5,
                z: 0,
                dir: 3
            }, {
                x: 15,
                y: 5,
                z: 1,
                dir: 0
            }, {
                x: 15,
                y: 5,
                z: 3,
                dir: 0
            }, {
                x: 15,
                y: 5,
                z: 4,
                dir: 1
            }, {
                x: 15,
                y: 5,
                z: 8,
                dir: 1
            }, {
                x: 15,
                y: 6,
                z: 0,
                dir: 1
            }, {
                x: 15,
                y: 6,
                z: 1,
                dir: 0
            }, {
                x: 15,
                y: 6,
                z: 2,
                dir: 3
            }, {
                x: 15,
                y: 6,
                z: 3,
                dir: 3
            }, {
                x: 15,
                y: 6,
                z: 4,
                dir: 3
            }, {
                x: 15,
                y: 6,
                z: 5,
                dir: 3
            }, {
                x: 15,
                y: 6,
                z: 6,
                dir: 2
            }, {
                x: 15,
                y: 6,
                z: 7,
                dir: 2
            }, {
                x: 15,
                y: 6,
                z: 8,
                dir: 2
            }, {
                x: 15,
                y: 6,
                z: 9,
                dir: 1
            }, {
                x: 15,
                y: 7,
                z: 0,
                dir: 3
            }, {
                x: 15,
                y: 7,
                z: 1,
                dir: 2
            }, {
                x: 15,
                y: 7,
                z: 8,
                dir: 1
            }, {
                x: 15,
                y: 8,
                z: 0,
                dir: 2
            }, {
                x: 15,
                y: 8,
                z: 1,
                dir: 2
            }, {
                x: 15,
                y: 8,
                z: 2,
                dir: 3
            }, {
                x: 15,
                y: 8,
                z: 3,
                dir: 0
            }, {
                x: 15,
                y: 8,
                z: 4,
                dir: 2
            }, {
                x: 15,
                y: 8,
                z: 5,
                dir: 0
            }, {
                x: 15,
                y: 8,
                z: 6,
                dir: 3
            }, {
                x: 15,
                y: 8,
                z: 7,
                dir: 0
            }, {
                x: 15,
                y: 8,
                z: 8,
                dir: 2
            }, {
                x: 15,
                y: 9,
                z: 4,
                dir: 0
            }, {
                x: 15,
                y: 9,
                z: 8,
                dir: 1
            }, {
                x: 15,
                y: 10,
                z: 3,
                dir: 0
            }, {
                x: 15,
                y: 10,
                z: 4,
                dir: 0
            }, {
                x: 15,
                y: 10,
                z: 5,
                dir: 3
            }, {
                x: 15,
                y: 10,
                z: 6,
                dir: 2
            }, {
                x: 15,
                y: 10,
                z: 7,
                dir: 1
            }, {
                x: 15,
                y: 10,
                z: 8,
                dir: 2
            }, {
                x: 15,
                y: 10,
                z: 9,
                dir: 1
            }, {
                x: 16,
                y: 1,
                z: 2,
                dir: 2
            }, {
                x: 16,
                y: 1,
                z: 4,
                dir: 1
            }, {
                x: 16,
                y: 1,
                z: 6,
                dir: 2
            }, {
                x: 16,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 16,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 16,
                y: 3,
                z: 2,
                dir: 3
            }, {
                x: 16,
                y: 3,
                z: 3,
                dir: 1
            }, {
                x: 16,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 16,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 16,
                y: 4,
                z: 4,
                dir: 0
            }, {
                x: 16,
                y: 4,
                z: 8,
                dir: 2
            }, {
                x: 16,
                y: 5,
                z: 4,
                dir: 2
            }, {
                x: 16,
                y: 5,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 6,
                z: 4,
                dir: 2
            }, {
                x: 16,
                y: 6,
                z: 5,
                dir: 0
            }, {
                x: 16,
                y: 6,
                z: 6,
                dir: 1
            }, {
                x: 16,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 16,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 6,
                z: 9,
                dir: 0
            }, {
                x: 16,
                y: 7,
                z: 4,
                dir: 3
            }, {
                x: 16,
                y: 8,
                z: 3,
                dir: 3
            }, {
                x: 16,
                y: 8,
                z: 4,
                dir: 2
            }, {
                x: 16,
                y: 8,
                z: 5,
                dir: 0
            }, {
                x: 16,
                y: 8,
                z: 7,
                dir: 0
            }, {
                x: 16,
                y: 8,
                z: 8,
                dir: 2
            }, {
                x: 16,
                y: 9,
                z: 4,
                dir: 0
            }, {
                x: 16,
                y: 10,
                z: 3,
                dir: 2
            }, {
                x: 16,
                y: 10,
                z: 4,
                dir: 2
            }, {
                x: 16,
                y: 10,
                z: 5,
                dir: 2
            }, {
                x: 16,
                y: 10,
                z: 6,
                dir: 0
            }, {
                x: 16,
                y: 10,
                z: 7,
                dir: 2
            }, {
                x: 16,
                y: 10,
                z: 9,
                dir: 1
            }, {
                x: 17,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 17,
                y: 1,
                z: 7,
                dir: 2
            }, {
                x: 17,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 17,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 17,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 17,
                y: 3,
                z: 3,
                dir: 2
            }, {
                x: 17,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 17,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 17,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 17,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 17,
                y: 4,
                z: 6,
                dir: 0
            }, {
                x: 17,
                y: 4,
                z: 8,
                dir: 1
            }, {
                x: 17,
                y: 5,
                z: 4,
                dir: 1
            }, {
                x: 17,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 17,
                y: 5,
                z: 8,
                dir: 3
            }, {
                x: 17,
                y: 6,
                z: 4,
                dir: 2
            }, {
                x: 17,
                y: 6,
                z: 5,
                dir: 2
            }, {
                x: 17,
                y: 6,
                z: 6,
                dir: 2
            }, {
                x: 17,
                y: 6,
                z: 7,
                dir: 2
            }, {
                x: 17,
                y: 6,
                z: 8,
                dir: 2
            }, {
                x: 17,
                y: 6,
                z: 9,
                dir: 1
            }, {
                x: 17,
                y: 7,
                z: 4,
                dir: 1
            }, {
                x: 17,
                y: 7,
                z: 5,
                dir: 2
            }, {
                x: 17,
                y: 7,
                z: 6,
                dir: 0
            }, {
                x: 17,
                y: 7,
                z: 7,
                dir: 1
            }, {
                x: 17,
                y: 7,
                z: 8,
                dir: 3
            }, {
                x: 17,
                y: 8,
                z: 3,
                dir: 1
            }, {
                x: 17,
                y: 8,
                z: 4,
                dir: 1
            }, {
                x: 17,
                y: 8,
                z: 5,
                dir: 3
            }, {
                x: 17,
                y: 8,
                z: 6,
                dir: 1
            }, {
                x: 17,
                y: 8,
                z: 7,
                dir: 2
            }, {
                x: 17,
                y: 8,
                z: 8,
                dir: 3
            }, {
                x: 17,
                y: 9,
                z: 3,
                dir: 1
            }, {
                x: 17,
                y: 9,
                z: 4,
                dir: 0
            }, {
                x: 17,
                y: 9,
                z: 8,
                dir: 1
            }, {
                x: 17,
                y: 10,
                z: 4,
                dir: 0
            }, {
                x: 17,
                y: 10,
                z: 5,
                dir: 3
            }, {
                x: 17,
                y: 10,
                z: 6,
                dir: 2
            }, {
                x: 17,
                y: 10,
                z: 7,
                dir: 1
            }, {
                x: 17,
                y: 10,
                z: 8,
                dir: 1
            }, {
                x: 17,
                y: 10,
                z: 9,
                dir: 2
            }, {
                x: 18,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 18,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 18,
                y: 3,
                z: 5,
                dir: 3
            }, {
                x: 18,
                y: 3,
                z: 6,
                dir: 2
            }, {
                x: 18,
                y: 3,
                z: 7,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 4,
                z: 4,
                dir: 3
            }, {
                x: 18,
                y: 4,
                z: 5,
                dir: 1
            }, {
                x: 18,
                y: 4,
                z: 6,
                dir: 2
            }, {
                x: 18,
                y: 4,
                z: 8,
                dir: 3
            }, {
                x: 18,
                y: 5,
                z: 4,
                dir: 0
            }, {
                x: 18,
                y: 5,
                z: 5,
                dir: 1
            }, {
                x: 18,
                y: 5,
                z: 6,
                dir: 1
            }, {
                x: 18,
                y: 5,
                z: 7,
                dir: 2
            }, {
                x: 18,
                y: 5,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 6,
                z: 4,
                dir: 2
            }, {
                x: 18,
                y: 6,
                z: 5,
                dir: 3
            }, {
                x: 18,
                y: 6,
                z: 6,
                dir: 2
            }, {
                x: 18,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 18,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 6,
                z: 9,
                dir: 3
            }, {
                x: 18,
                y: 7,
                z: 4,
                dir: 3
            }, {
                x: 18,
                y: 7,
                z: 5,
                dir: 0
            }, {
                x: 18,
                y: 7,
                z: 6,
                dir: 2
            }, {
                x: 18,
                y: 7,
                z: 7,
                dir: 3
            }, {
                x: 18,
                y: 7,
                z: 8,
                dir: 1
            }, {
                x: 18,
                y: 8,
                z: 3,
                dir: 1
            }, {
                x: 18,
                y: 8,
                z: 4,
                dir: 2
            }, {
                x: 18,
                y: 8,
                z: 5,
                dir: 0
            }, {
                x: 18,
                y: 8,
                z: 6,
                dir: 3
            }, {
                x: 18,
                y: 8,
                z: 7,
                dir: 2
            }, {
                x: 18,
                y: 8,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 9,
                z: 4,
                dir: 2
            }, {
                x: 18,
                y: 9,
                z: 5,
                dir: 0
            }, {
                x: 18,
                y: 9,
                z: 7,
                dir: 2
            }, {
                x: 18,
                y: 9,
                z: 8,
                dir: 1
            }, {
                x: 18,
                y: 10,
                z: 4,
                dir: 0
            }, {
                x: 18,
                y: 10,
                z: 5,
                dir: 0
            }, {
                x: 18,
                y: 10,
                z: 6,
                dir: 0
            }, {
                x: 18,
                y: 10,
                z: 7,
                dir: 3
            }, {
                x: 18,
                y: 10,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 10,
                z: 9,
                dir: 3
            }, {
                x: 18,
                y: 11,
                z: 4,
                dir: 1
            }, {
                x: 18,
                y: 11,
                z: 9,
                dir: 3
            }, {
                x: 19,
                y: 1,
                z: 2,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 3,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 4,
                dir: 0
            }, {
                x: 19,
                y: 3,
                z: 5,
                dir: 2
            }, {
                x: 19,
                y: 3,
                z: 6,
                dir: 3
            }, {
                x: 19,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 19,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 19,
                y: 6,
                z: 7,
                dir: 3
            }, {
                x: 19,
                y: 6,
                z: 8,
                dir: 2
            }, {
                x: 19,
                y: 6,
                z: 9,
                dir: 1
            }, {
                x: 19,
                y: 7,
                z: 7,
                dir: 1
            }, {
                x: 19,
                y: 8,
                z: 3,
                dir: 1
            }, {
                x: 19,
                y: 8,
                z: 4,
                dir: 0
            }, {
                x: 19,
                y: 8,
                z: 5,
                dir: 0
            }, {
                x: 19,
                y: 8,
                z: 6,
                dir: 1
            }, {
                x: 20,
                y: 1,
                z: 2,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 20,
                y: 3,
                z: 2,
                dir: 2
            }, {
                x: 20,
                y: 3,
                z: 3,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 4,
                dir: 1
            }, {
                x: 20,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 6,
                dir: 3
            }, {
                x: 20,
                y: 3,
                z: 7,
                dir: 3
            }, {
                x: 20,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 21,
                y: 1,
                z: 2,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 21,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 21,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 5,
                dir: 3
            }, {
                x: 21,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 21,
                y: 3,
                z: 7,
                dir: 2
            }, {
                x: 21,
                y: 3,
                z: 8,
                dir: 1
            }, {
                x: 22,
                y: 1,
                z: 2,
                dir: 2
            }, {
                x: 22,
                y: 1,
                z: 3,
                dir: 2
            }, {
                x: 22,
                y: 1,
                z: 4,
                dir: 2
            }, {
                x: 22,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 22,
                y: 1,
                z: 6,
                dir: 3
            }, {
                x: 22,
                y: 1,
                z: 8,
                dir: 3
            }, {
                x: 22,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 22,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 22,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 22,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 22,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 22,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 22,
                y: 3,
                z: 3,
                dir: 0
            }, {
                x: 22,
                y: 3,
                z: 4,
                dir: 2
            }, {
                x: 22,
                y: 3,
                z: 5,
                dir: 2
            }, {
                x: 22,
                y: 3,
                z: 6,
                dir: 1
            }, {
                x: 22,
                y: 3,
                z: 7,
                dir: 2
            }, {
                x: 22,
                y: 3,
                z: 8,
                dir: 3
            }]
        },
        4: {
            0: [{
                x: 4,
                y: 8,
                z: 5,
                dir: 1
            }, {
                x: 4,
                y: 8,
                z: 9,
                dir: 0
            }, {
                x: 9,
                y: 8,
                z: 5,
                dir: 2
            }, {
                x: 9,
                y: 8,
                z: 7,
                dir: 3
            }, {
                x: 9,
                y: 8,
                z: 9,
                dir: 2
            }, {
                x: 13,
                y: 12,
                z: 3,
                dir: 3
            }, {
                x: 13,
                y: 12,
                z: 9,
                dir: 0
            }, {
                x: 18,
                y: 12,
                z: 4,
                dir: 3
            }, {
                x: 18,
                y: 12,
                z: 9,
                dir: 2
            }]
        },
        5: {
            0: [{
                x: 3,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 4,
                y: 4,
                z: 3,
                dir: 2
            }, {
                x: 5,
                y: 1,
                z: 6,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 6,
                y: 5,
                z: 8,
                dir: 1
            }, {
                x: 7,
                y: 6,
                z: 8,
                dir: 1
            }, {
                x: 8,
                y: 7,
                z: 6,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 7,
                dir: 1
            }, {
                x: 13,
                y: 5,
                z: 7,
                dir: 0
            }, {
                x: 13,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 16,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 16,
                y: 4,
                z: 2,
                dir: 3
            }, {
                x: 17,
                y: 3,
                z: 7,
                dir: 1
            }, {
                x: 17,
                y: 10,
                z: 3,
                dir: 3
            }, {
                x: 18,
                y: 9,
                z: 3,
                dir: 3
            }, {
                x: 19,
                y: 7,
                z: 8,
                dir: 2
            }, {
                x: 19,
                y: 8,
                z: 7,
                dir: 2
            }]
        },
        6: {
            0: [{
                x: 10,
                y: 1,
                z: 9,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 13,
                y: 3,
                z: 4,
                dir: 1
            }, {
                x: 13,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 13,
                y: 5,
                z: 2,
                dir: 2
            }, {
                x: 13,
                y: 6,
                z: 2,
                dir: 2
            }, {
                x: 16,
                y: 7,
                z: 6,
                dir: 1
            }, {
                x: 16,
                y: 8,
                z: 6,
                dir: 1
            }, {
                x: 16,
                y: 9,
                z: 8,
                dir: 1
            }, {
                x: 16,
                y: 10,
                z: 8,
                dir: 1
            }]
        }
    },
    width: 24,
    height: 13,
    depth: 12,
    name: "",
    surfaceArea: 496
}, {
    data: {
        1: {
            1: [{
                x: 1,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 1,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 1,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 1,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 1,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 1,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 1,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 1,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 1,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 1,
                y: 2,
                z: 13,
                dir: 1
            }, {
                x: 1,
                y: 2,
                z: 14,
                dir: 2
            }, {
                x: 1,
                y: 2,
                z: 15,
                dir: 2
            }, {
                x: 1,
                y: 2,
                z: 16,
                dir: 1
            }, {
                x: 1,
                y: 2,
                z: 17,
                dir: 2
            }, {
                x: 1,
                y: 2,
                z: 18,
                dir: 1
            }, {
                x: 1,
                y: 2,
                z: 19,
                dir: 3
            }, {
                x: 1,
                y: 2,
                z: 20,
                dir: 3
            }, {
                x: 1,
                y: 2,
                z: 21,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 2,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 2,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 2,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 10,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 13,
                dir: 1
            }, {
                x: 2,
                y: 2,
                z: 14,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 2,
                y: 2,
                z: 16,
                dir: 1
            }, {
                x: 2,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 2,
                y: 2,
                z: 18,
                dir: 3
            }, {
                x: 2,
                y: 2,
                z: 19,
                dir: 0
            }, {
                x: 2,
                y: 2,
                z: 20,
                dir: 1
            }, {
                x: 2,
                y: 2,
                z: 21,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 3,
                y: 2,
                z: 2,
                dir: 3
            }, {
                x: 3,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 3,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 3,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 3,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 3,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 3,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 3,
                y: 2,
                z: 13,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 14,
                dir: 3
            }, {
                x: 3,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 16,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 17,
                dir: 3
            }, {
                x: 3,
                y: 2,
                z: 18,
                dir: 2
            }, {
                x: 3,
                y: 2,
                z: 19,
                dir: 0
            }, {
                x: 3,
                y: 2,
                z: 20,
                dir: 1
            }, {
                x: 3,
                y: 2,
                z: 21,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 4,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 4,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 4,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 4,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 4,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 4,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 4,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 4,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 14,
                dir: 3
            }, {
                x: 4,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 18,
                dir: 0
            }, {
                x: 4,
                y: 2,
                z: 19,
                dir: 1
            }, {
                x: 4,
                y: 2,
                z: 20,
                dir: 1
            }, {
                x: 4,
                y: 2,
                z: 21,
                dir: 2
            }, {
                x: 5,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 5,
                y: 2,
                z: 2,
                dir: 3
            }, {
                x: 5,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 5,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 5,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 5,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 5,
                y: 2,
                z: 16,
                dir: 3
            }, {
                x: 5,
                y: 2,
                z: 17,
                dir: 2
            }, {
                x: 5,
                y: 2,
                z: 18,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 19,
                dir: 2
            }, {
                x: 5,
                y: 2,
                z: 20,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 21,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 14,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 16,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 18,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 19,
                dir: 2
            }, {
                x: 6,
                y: 2,
                z: 20,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 21,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 7,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 12,
                dir: 2
            }, {
                x: 7,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 15,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 16,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 7,
                y: 2,
                z: 18,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 19,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 20,
                dir: 2
            }, {
                x: 7,
                y: 2,
                z: 21,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 13,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 15,
                dir: 3
            }, {
                x: 8,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 8,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 18,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 19,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 20,
                dir: 2
            }, {
                x: 8,
                y: 2,
                z: 21,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 13,
                dir: 2
            }, {
                x: 9,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 15,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 16,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 17,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 16,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 18,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 19,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 20,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 21,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 16,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 17,
                dir: 2
            }, {
                x: 10,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 10,
                y: 1,
                z: 18,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 2,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 14,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 16,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 18,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 19,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 20,
                dir: 3
            }, {
                x: 10,
                y: 2,
                z: 21,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 14,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 12,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 16,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 17,
                dir: 3
            }, {
                x: 11,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 11,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 11,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 11,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 11,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 11,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 16,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 17,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 18,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 19,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 20,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 21,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 12,
                dir: 3
            }, {
                x: 12,
                y: 1,
                z: 16,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 12,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 12,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 12,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 12,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 12,
                dir: 2
            }, {
                x: 12,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 14,
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 15,
                dir: 2
            }, {
                x: 12,
                y: 2,
                z: 16,
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 17,
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 18,
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 19,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 20,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 21,
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 13,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 13,
                y: 1,
                z: 12,
                dir: 2
            }, {
                x: 13,
                y: 1,
                z: 16,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 2,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 10,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 16,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 18,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 19,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 20,
                dir: 0
            }, {
                x: 13,
                y: 2,
                z: 21,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 14,
                y: 1,
                z: 12,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 17,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 14,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 10,
                dir: 3
            }, {
                x: 14,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 14,
                y: 2,
                z: 12,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 15,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 16,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 17,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 18,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 19,
                dir: 3
            }, {
                x: 14,
                y: 2,
                z: 20,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 21,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 16,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 17,
                dir: 3
            }, {
                x: 15,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 18,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 14,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 16,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 18,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 19,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 20,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 21,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 16,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 16,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 16,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 17,
                dir: 1
            }, {
                x: 16,
                y: 1,
                z: 12,
                dir: 3
            }, {
                x: 16,
                y: 1,
                z: 18,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 16,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 16,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 16,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 16,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 13,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 14,
                dir: 3
            }, {
                x: 16,
                y: 2,
                z: 15,
                dir: 3
            }, {
                x: 16,
                y: 2,
                z: 16,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 17,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 18,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 19,
                dir: 1
            }, {
                x: 16,
                y: 2,
                z: 20,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 21,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 17,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 16,
                dir: 3
            }, {
                x: 17,
                y: 0,
                z: 17,
                dir: 2
            }, {
                x: 17,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 17,
                y: 1,
                z: 18,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 2,
                dir: 3
            }, {
                x: 17,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 17,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 17,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 17,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 17,
                y: 2,
                z: 13,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 17,
                y: 2,
                z: 15,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 17,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 18,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 19,
                dir: 2
            }, {
                x: 17,
                y: 2,
                z: 20,
                dir: 0
            }, {
                x: 17,
                y: 2,
                z: 21,
                dir: 3
            }, {
                x: 18,
                y: 0,
                z: 13,
                dir: 2
            }, {
                x: 18,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 16,
                dir: 2
            }, {
                x: 18,
                y: 0,
                z: 17,
                dir: 3
            }, {
                x: 18,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 18,
                y: 1,
                z: 18,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 18,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 18,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 18,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 18,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 18,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 18,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 18,
                y: 2,
                z: 13,
                dir: 2
            }, {
                x: 18,
                y: 2,
                z: 14,
                dir: 2
            }, {
                x: 18,
                y: 2,
                z: 15,
                dir: 3
            }, {
                x: 18,
                y: 2,
                z: 16,
                dir: 3
            }, {
                x: 18,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 18,
                y: 2,
                z: 18,
                dir: 3
            }, {
                x: 18,
                y: 2,
                z: 19,
                dir: 0
            }, {
                x: 18,
                y: 2,
                z: 20,
                dir: 2
            }, {
                x: 18,
                y: 2,
                z: 21,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 13,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 19,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 16,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 17,
                dir: 1
            }, {
                x: 19,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 19,
                y: 1,
                z: 18,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 19,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 19,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 19,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 19,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 19,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 19,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 19,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 19,
                y: 2,
                z: 13,
                dir: 1
            }, {
                x: 19,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 16,
                dir: 3
            }, {
                x: 19,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 19,
                y: 2,
                z: 18,
                dir: 0
            }, {
                x: 19,
                y: 2,
                z: 19,
                dir: 2
            }, {
                x: 19,
                y: 2,
                z: 20,
                dir: 2
            }, {
                x: 19,
                y: 2,
                z: 21,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 16,
                dir: 1
            }, {
                x: 20,
                y: 0,
                z: 17,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 13,
                dir: 2
            }, {
                x: 20,
                y: 1,
                z: 14,
                dir: 2
            }, {
                x: 20,
                y: 1,
                z: 15,
                dir: 3
            }, {
                x: 20,
                y: 1,
                z: 18,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 20,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 20,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 20,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 20,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 20,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 20,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 20,
                y: 2,
                z: 12,
                dir: 2
            }, {
                x: 20,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 15,
                dir: 2
            }, {
                x: 20,
                y: 2,
                z: 16,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 18,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 19,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 20,
                dir: 3
            }, {
                x: 20,
                y: 2,
                z: 21,
                dir: 1
            }, {
                x: 21,
                y: 0,
                z: 16,
                dir: 3
            }, {
                x: 21,
                y: 0,
                z: 17,
                dir: 1
            }, {
                x: 21,
                y: 1,
                z: 15,
                dir: 3
            }, {
                x: 21,
                y: 1,
                z: 17,
                dir: 0
            }, {
                x: 21,
                y: 1,
                z: 18,
                dir: 3
            }, {
                x: 21,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 21,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 21,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 21,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 21,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 21,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 21,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 21,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 21,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 21,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 21,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 21,
                y: 2,
                z: 14,
                dir: 2
            }, {
                x: 21,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 21,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 21,
                y: 2,
                z: 18,
                dir: 3
            }, {
                x: 21,
                y: 2,
                z: 19,
                dir: 2
            }, {
                x: 21,
                y: 2,
                z: 20,
                dir: 3
            }, {
                x: 21,
                y: 2,
                z: 21,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 16,
                dir: 0
            }, {
                x: 22,
                y: 0,
                z: 17,
                dir: 3
            }, {
                x: 22,
                y: 0,
                z: 18,
                dir: 2
            }, {
                x: 22,
                y: 1,
                z: 15,
                dir: 1
            }, {
                x: 22,
                y: 1,
                z: 19,
                dir: 2
            }, {
                x: 22,
                y: 2,
                z: 1,
                dir: 1
            }, {
                x: 22,
                y: 2,
                z: 2,
                dir: 1
            }, {
                x: 22,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 4,
                dir: 2
            }, {
                x: 22,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 22,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 22,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 22,
                y: 2,
                z: 8,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 22,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 22,
                y: 2,
                z: 15,
                dir: 2
            }, {
                x: 22,
                y: 2,
                z: 16,
                dir: 1
            }, {
                x: 22,
                y: 2,
                z: 17,
                dir: 3
            }, {
                x: 22,
                y: 2,
                z: 19,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 20,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 21,
                dir: 3
            }, {
                x: 23,
                y: 1,
                z: 16,
                dir: 3
            }, {
                x: 23,
                y: 1,
                z: 17,
                dir: 2
            }, {
                x: 23,
                y: 1,
                z: 18,
                dir: 3
            }, {
                x: 23,
                y: 2,
                z: 1,
                dir: 2
            }, {
                x: 23,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 23,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 23,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 23,
                y: 2,
                z: 5,
                dir: 0
            }, {
                x: 23,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 23,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 23,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 23,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 23,
                y: 2,
                z: 10,
                dir: 3
            }, {
                x: 23,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 23,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 23,
                y: 2,
                z: 13,
                dir: 1
            }, {
                x: 23,
                y: 2,
                z: 14,
                dir: 0
            }, {
                x: 23,
                y: 2,
                z: 15,
                dir: 0
            }, {
                x: 23,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 23,
                y: 2,
                z: 17,
                dir: 0
            }, {
                x: 23,
                y: 2,
                z: 18,
                dir: 1
            }, {
                x: 23,
                y: 2,
                z: 19,
                dir: 2
            }, {
                x: 23,
                y: 2,
                z: 20,
                dir: 0
            }, {
                x: 23,
                y: 2,
                z: 21,
                dir: 0
            }, {
                x: 24,
                y: 2,
                z: 1,
                dir: 3
            }, {
                x: 24,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 24,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 24,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 24,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 24,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 24,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 24,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 24,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 24,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 24,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 24,
                y: 2,
                z: 12,
                dir: 2
            }, {
                x: 24,
                y: 2,
                z: 13,
                dir: 3
            }, {
                x: 24,
                y: 2,
                z: 14,
                dir: 2
            }, {
                x: 24,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 24,
                y: 2,
                z: 16,
                dir: 0
            }, {
                x: 24,
                y: 2,
                z: 17,
                dir: 3
            }, {
                x: 24,
                y: 2,
                z: 18,
                dir: 2
            }, {
                x: 24,
                y: 2,
                z: 19,
                dir: 2
            }, {
                x: 24,
                y: 2,
                z: 20,
                dir: 3
            }, {
                x: 24,
                y: 2,
                z: 21,
                dir: 3
            }, {
                x: 25,
                y: 2,
                z: 1,
                dir: 0
            }, {
                x: 25,
                y: 2,
                z: 2,
                dir: 3
            }, {
                x: 25,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 25,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 25,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 25,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 25,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 25,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 25,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 25,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 25,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 25,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 25,
                y: 2,
                z: 13,
                dir: 0
            }, {
                x: 25,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 25,
                y: 2,
                z: 15,
                dir: 2
            }, {
                x: 25,
                y: 2,
                z: 16,
                dir: 3
            }, {
                x: 25,
                y: 2,
                z: 17,
                dir: 3
            }, {
                x: 25,
                y: 2,
                z: 18,
                dir: 1
            }, {
                x: 25,
                y: 2,
                z: 19,
                dir: 1
            }, {
                x: 25,
                y: 2,
                z: 20,
                dir: 3
            }, {
                x: 25,
                y: 2,
                z: 21,
                dir: 2
            }]
        },
        2: {
            0: [{
                x: 3,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 3,
                y: 3,
                z: 9,
                dir: 1
            }, {
                x: 3,
                y: 3,
                z: 16,
                dir: 2
            }, {
                x: 3,
                y: 4,
                z: 15,
                dir: 3
            }, {
                x: 3,
                y: 5,
                z: 18,
                dir: 3
            }, {
                x: 3,
                y: 5,
                z: 19,
                dir: 2
            }, {
                x: 4,
                y: 3,
                z: 10,
                dir: 0
            }, {
                x: 4,
                y: 3,
                z: 11,
                dir: 1
            }, {
                x: 4,
                y: 3,
                z: 19,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 16,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 17,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 18,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 10,
                dir: 1
            }, {
                x: 5,
                y: 3,
                z: 11,
                dir: 1
            }, {
                x: 5,
                y: 3,
                z: 15,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 16,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 17,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 18,
                dir: 2
            }, {
                x: 5,
                y: 4,
                z: 18,
                dir: 2
            }, {
                x: 5,
                y: 4,
                z: 19,
                dir: 2
            }, {
                x: 6,
                y: 3,
                z: 10,
                dir: 0
            }, {
                x: 6,
                y: 3,
                z: 11,
                dir: 1
            }, {
                x: 6,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 6,
                y: 3,
                z: 18,
                dir: 2
            }, {
                x: 9,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 9,
                y: 3,
                z: 19,
                dir: 3
            }, {
                x: 9,
                y: 4,
                z: 19,
                dir: 3
            }, {
                x: 9,
                y: 5,
                z: 15,
                dir: 3
            }, {
                x: 9,
                y: 5,
                z: 16,
                dir: 1
            }, {
                x: 9,
                y: 5,
                z: 17,
                dir: 0
            }, {
                x: 10,
                y: 3,
                z: 3,
                dir: 1
            }, {
                x: 10,
                y: 3,
                z: 15,
                dir: 2
            }, {
                x: 10,
                y: 4,
                z: 19,
                dir: 2
            }, {
                x: 10,
                y: 5,
                z: 15,
                dir: 2
            }, {
                x: 10,
                y: 5,
                z: 18,
                dir: 1
            }, {
                x: 10,
                y: 5,
                z: 19,
                dir: 0
            }, {
                x: 11,
                y: 3,
                z: 6,
                dir: 3
            }, {
                x: 11,
                y: 3,
                z: 11,
                dir: 1
            }, {
                x: 11,
                y: 4,
                z: 16,
                dir: 1
            }, {
                x: 11,
                y: 5,
                z: 19,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 11,
                dir: 3
            }, {
                x: 12,
                y: 3,
                z: 17,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 18,
                dir: 0
            }, {
                x: 12,
                y: 4,
                z: 15,
                dir: 1
            }, {
                x: 12,
                y: 4,
                z: 16,
                dir: 2
            }, {
                x: 13,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 13,
                y: 3,
                z: 10,
                dir: 1
            }, {
                x: 14,
                y: 3,
                z: 6,
                dir: 3
            }, {
                x: 14,
                y: 3,
                z: 10,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 15,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 17,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 19,
                dir: 1
            }, {
                x: 15,
                y: 4,
                z: 15,
                dir: 3
            }, {
                x: 16,
                y: 3,
                z: 17,
                dir: 2
            }, {
                x: 16,
                y: 4,
                z: 15,
                dir: 2
            }, {
                x: 16,
                y: 4,
                z: 17,
                dir: 3
            }, {
                x: 16,
                y: 4,
                z: 18,
                dir: 3
            }, {
                x: 17,
                y: 3,
                z: 2,
                dir: 3
            }, {
                x: 17,
                y: 3,
                z: 11,
                dir: 3
            }, {
                x: 17,
                y: 3,
                z: 17,
                dir: 1
            }, {
                x: 17,
                y: 4,
                z: 7,
                dir: 1
            }, {
                x: 17,
                y: 4,
                z: 18,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 18,
                y: 3,
                z: 17,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 18,
                dir: 2
            }, {
                x: 18,
                y: 3,
                z: 19,
                dir: 1
            }, {
                x: 18,
                y: 4,
                z: 7,
                dir: 1
            }, {
                x: 18,
                y: 4,
                z: 8,
                dir: 1
            }, {
                x: 18,
                y: 4,
                z: 16,
                dir: 0
            }, {
                x: 19,
                y: 3,
                z: 3,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 21,
                y: 3,
                z: 6,
                dir: 2
            }, {
                x: 22,
                y: 3,
                z: 1,
                dir: 1
            }],
            1: [{
                x: 3,
                y: 3,
                z: 19,
                dir: 2
            }, {
                x: 3,
                y: 4,
                z: 16,
                dir: 2
            }, {
                x: 3,
                y: 4,
                z: 17,
                dir: 3
            }, {
                x: 3,
                y: 4,
                z: 19,
                dir: 3
            }, {
                x: 4,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 4,
                y: 3,
                z: 9,
                dir: 3
            }, {
                x: 4,
                y: 3,
                z: 12,
                dir: 0
            }, {
                x: 4,
                y: 3,
                z: 15,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 11,
                dir: 3
            }, {
                x: 4,
                y: 5,
                z: 16,
                dir: 0
            }, {
                x: 4,
                y: 5,
                z: 17,
                dir: 3
            }, {
                x: 4,
                y: 5,
                z: 18,
                dir: 2
            }, {
                x: 4,
                y: 5,
                z: 19,
                dir: 3
            }, {
                x: 5,
                y: 3,
                z: 9,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 12,
                dir: 0
            }, {
                x: 5,
                y: 3,
                z: 19,
                dir: 2
            }, {
                x: 5,
                y: 4,
                z: 10,
                dir: 3
            }, {
                x: 5,
                y: 4,
                z: 16,
                dir: 2
            }, {
                x: 5,
                y: 5,
                z: 17,
                dir: 3
            }, {
                x: 5,
                y: 5,
                z: 19,
                dir: 3
            }, {
                x: 6,
                y: 3,
                z: 9,
                dir: 3
            }, {
                x: 6,
                y: 3,
                z: 15,
                dir: 2
            }, {
                x: 6,
                y: 3,
                z: 19,
                dir: 2
            }, {
                x: 9,
                y: 3,
                z: 15,
                dir: 2
            }, {
                x: 9,
                y: 4,
                z: 17,
                dir: 0
            }, {
                x: 9,
                y: 4,
                z: 18,
                dir: 2
            }, {
                x: 9,
                y: 5,
                z: 19,
                dir: 0
            }, {
                x: 10,
                y: 4,
                z: 15,
                dir: 0
            }, {
                x: 10,
                y: 4,
                z: 18,
                dir: 2
            }, {
                x: 11,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 11,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 11,
                y: 3,
                z: 18,
                dir: 3
            }, {
                x: 11,
                y: 3,
                z: 19,
                dir: 2
            }, {
                x: 11,
                y: 5,
                z: 15,
                dir: 1
            }, {
                x: 11,
                y: 5,
                z: 18,
                dir: 1
            }, {
                x: 12,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 12,
                y: 4,
                z: 17,
                dir: 2
            }, {
                x: 12,
                y: 4,
                z: 18,
                dir: 0
            }, {
                x: 12,
                y: 5,
                z: 15,
                dir: 0
            }, {
                x: 12,
                y: 5,
                z: 19,
                dir: 3
            }, {
                x: 13,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 13,
                y: 3,
                z: 11,
                dir: 3
            }, {
                x: 14,
                y: 3,
                z: 3,
                dir: 0
            }, {
                x: 14,
                y: 4,
                z: 10,
                dir: 3
            }, {
                x: 15,
                y: 3,
                z: 9,
                dir: 2
            }, {
                x: 15,
                y: 3,
                z: 10,
                dir: 1
            }, {
                x: 15,
                y: 3,
                z: 15,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 16,
                dir: 2
            }, {
                x: 15,
                y: 4,
                z: 17,
                dir: 3
            }, {
                x: 15,
                y: 4,
                z: 18,
                dir: 3
            }, {
                x: 16,
                y: 3,
                z: 16,
                dir: 1
            }, {
                x: 16,
                y: 3,
                z: 19,
                dir: 1
            }, {
                x: 17,
                y: 3,
                z: 3,
                dir: 1
            }, {
                x: 17,
                y: 3,
                z: 6,
                dir: 1
            }, {
                x: 17,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 17,
                y: 3,
                z: 16,
                dir: 2
            }, {
                x: 17,
                y: 3,
                z: 19,
                dir: 3
            }, {
                x: 17,
                y: 4,
                z: 19,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 18,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 18,
                y: 3,
                z: 16,
                dir: 3
            }, {
                x: 18,
                y: 4,
                z: 15,
                dir: 2
            }, {
                x: 18,
                y: 4,
                z: 19,
                dir: 0
            }, {
                x: 19,
                y: 3,
                z: 11,
                dir: 3
            }, {
                x: 20,
                y: 3,
                z: 11,
                dir: 2
            }, {
                x: 21,
                y: 3,
                z: 11,
                dir: 2
            }, {
                x: 24,
                y: 3,
                z: 2,
                dir: 1
            }, {
                x: 25,
                y: 3,
                z: 1,
                dir: 2
            }, {
                x: 25,
                y: 3,
                z: 2,
                dir: 0
            }],
            2: [{
                x: 3,
                y: 3,
                z: 10,
                dir: 3
            }, {
                x: 3,
                y: 3,
                z: 11,
                dir: 2
            }, {
                x: 3,
                y: 3,
                z: 12,
                dir: 2
            }, {
                x: 3,
                y: 3,
                z: 15,
                dir: 2
            }, {
                x: 3,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 3,
                y: 3,
                z: 18,
                dir: 0
            }, {
                x: 3,
                y: 4,
                z: 18,
                dir: 2
            }, {
                x: 4,
                y: 3,
                z: 16,
                dir: 2
            }, {
                x: 4,
                y: 3,
                z: 17,
                dir: 2
            }, {
                x: 4,
                y: 3,
                z: 18,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 9,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 10,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 15,
                dir: 2
            }, {
                x: 4,
                y: 4,
                z: 19,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 8,
                dir: 1
            }, {
                x: 5,
                y: 4,
                z: 9,
                dir: 2
            }, {
                x: 5,
                y: 4,
                z: 11,
                dir: 3
            }, {
                x: 5,
                y: 4,
                z: 15,
                dir: 0
            }, {
                x: 5,
                y: 4,
                z: 17,
                dir: 2
            }, {
                x: 5,
                y: 5,
                z: 16,
                dir: 3
            }, {
                x: 5,
                y: 5,
                z: 18,
                dir: 2
            }, {
                x: 6,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 6,
                y: 3,
                z: 12,
                dir: 2
            }, {
                x: 6,
                y: 3,
                z: 16,
                dir: 3
            }, {
                x: 9,
                y: 3,
                z: 16,
                dir: 0
            }, {
                x: 9,
                y: 3,
                z: 17,
                dir: 1
            }, {
                x: 9,
                y: 3,
                z: 18,
                dir: 1
            }, {
                x: 9,
                y: 4,
                z: 15,
                dir: 1
            }, {
                x: 9,
                y: 4,
                z: 16,
                dir: 1
            }, {
                x: 9,
                y: 5,
                z: 18,
                dir: 3
            }, {
                x: 10,
                y: 3,
                z: 16,
                dir: 0
            }, {
                x: 10,
                y: 3,
                z: 18,
                dir: 2
            }, {
                x: 10,
                y: 3,
                z: 19,
                dir: 0
            }, {
                x: 10,
                y: 4,
                z: 16,
                dir: 3
            }, {
                x: 10,
                y: 5,
                z: 16,
                dir: 1
            }, {
                x: 11,
                y: 3,
                z: 16,
                dir: 3
            }, {
                x: 11,
                y: 4,
                z: 15,
                dir: 2
            }, {
                x: 11,
                y: 4,
                z: 18,
                dir: 3
            }, {
                x: 11,
                y: 4,
                z: 19,
                dir: 2
            }, {
                x: 12,
                y: 3,
                z: 3,
                dir: 3
            }, {
                x: 12,
                y: 3,
                z: 6,
                dir: 2
            }, {
                x: 12,
                y: 3,
                z: 16,
                dir: 1
            }, {
                x: 12,
                y: 3,
                z: 19,
                dir: 3
            }, {
                x: 12,
                y: 4,
                z: 19,
                dir: 1
            }, {
                x: 12,
                y: 5,
                z: 16,
                dir: 3
            }, {
                x: 12,
                y: 5,
                z: 17,
                dir: 0
            }, {
                x: 12,
                y: 5,
                z: 18,
                dir: 3
            }, {
                x: 13,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 13,
                y: 4,
                z: 10,
                dir: 3
            }, {
                x: 14,
                y: 3,
                z: 2,
                dir: 3
            }, {
                x: 14,
                y: 3,
                z: 9,
                dir: 3
            }, {
                x: 14,
                y: 3,
                z: 11,
                dir: 3
            }, {
                x: 15,
                y: 3,
                z: 11,
                dir: 2
            }, {
                x: 15,
                y: 3,
                z: 18,
                dir: 2
            }, {
                x: 15,
                y: 4,
                z: 16,
                dir: 2
            }, {
                x: 16,
                y: 3,
                z: 15,
                dir: 1
            }, {
                x: 16,
                y: 3,
                z: 18,
                dir: 0
            }, {
                x: 16,
                y: 4,
                z: 16,
                dir: 2
            }, {
                x: 16,
                y: 4,
                z: 19,
                dir: 1
            }, {
                x: 17,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 17,
                y: 3,
                z: 15,
                dir: 0
            }, {
                x: 17,
                y: 3,
                z: 18,
                dir: 0
            }, {
                x: 17,
                y: 4,
                z: 8,
                dir: 1
            }, {
                x: 17,
                y: 4,
                z: 15,
                dir: 1
            }, {
                x: 17,
                y: 4,
                z: 16,
                dir: 2
            }, {
                x: 17,
                y: 4,
                z: 17,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 6,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 11,
                dir: 3
            }, {
                x: 18,
                y: 3,
                z: 15,
                dir: 0
            }, {
                x: 22,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 23,
                y: 3,
                z: 1,
                dir: 2
            }, {
                x: 24,
                y: 3,
                z: 1,
                dir: 1
            }],
            3: [{
                x: 2,
                y: 3,
                z: 2,
                dir: 3
            }, {
                x: 2,
                y: 3,
                z: 3,
                dir: 2
            }, {
                x: 2,
                y: 3,
                z: 4,
                dir: 1
            }, {
                x: 2,
                y: 3,
                z: 5,
                dir: 1
            }, {
                x: 3,
                y: 4,
                z: 2,
                dir: 0
            }, {
                x: 3,
                y: 4,
                z: 3,
                dir: 3
            }, {
                x: 3,
                y: 4,
                z: 4,
                dir: 2
            }, {
                x: 3,
                y: 4,
                z: 5,
                dir: 1
            }, {
                x: 4,
                y: 4,
                z: 2,
                dir: 3
            }, {
                x: 4,
                y: 4,
                z: 3,
                dir: 0
            }, {
                x: 4,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 4,
                y: 4,
                z: 5,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 5,
                y: 3,
                z: 3,
                dir: 2
            }, {
                x: 5,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 5,
                y: 3,
                z: 5,
                dir: 2
            }, {
                x: 10,
                y: 3,
                z: 5,
                dir: 2
            }, {
                x: 10,
                y: 3,
                z: 6,
                dir: 1
            }, {
                x: 10,
                y: 3,
                z: 7,
                dir: 3
            }, {
                x: 10,
                y: 3,
                z: 10,
                dir: 3
            }, {
                x: 10,
                y: 3,
                z: 11,
                dir: 2
            }, {
                x: 10,
                y: 3,
                z: 12,
                dir: 3
            }, {
                x: 10,
                y: 4,
                z: 6,
                dir: 3
            }, {
                x: 10,
                y: 4,
                z: 7,
                dir: 3
            }, {
                x: 10,
                y: 4,
                z: 10,
                dir: 3
            }, {
                x: 10,
                y: 4,
                z: 11,
                dir: 3
            }, {
                x: 10,
                y: 5,
                z: 7,
                dir: 2
            }, {
                x: 10,
                y: 5,
                z: 8,
                dir: 0
            }, {
                x: 10,
                y: 5,
                z: 9,
                dir: 1
            }, {
                x: 10,
                y: 5,
                z: 10,
                dir: 1
            }, {
                x: 10,
                y: 6,
                z: 8,
                dir: 2
            }, {
                x: 10,
                y: 6,
                z: 9,
                dir: 1
            }, {
                x: 11,
                y: 3,
                z: 5,
                dir: 2
            }, {
                x: 11,
                y: 3,
                z: 12,
                dir: 3
            }, {
                x: 11,
                y: 4,
                z: 6,
                dir: 1
            }, {
                x: 11,
                y: 4,
                z: 11,
                dir: 0
            }, {
                x: 11,
                y: 5,
                z: 7,
                dir: 2
            }, {
                x: 11,
                y: 5,
                z: 10,
                dir: 3
            }, {
                x: 11,
                y: 6,
                z: 8,
                dir: 3
            }, {
                x: 11,
                y: 6,
                z: 9,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 12,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 12,
                dir: 2
            }, {
                x: 12,
                y: 4,
                z: 6,
                dir: 2
            }, {
                x: 12,
                y: 4,
                z: 11,
                dir: 3
            }, {
                x: 12,
                y: 5,
                z: 7,
                dir: 2
            }, {
                x: 12,
                y: 5,
                z: 10,
                dir: 2
            }, {
                x: 12,
                y: 6,
                z: 8,
                dir: 1
            }, {
                x: 12,
                y: 6,
                z: 9,
                dir: 3
            }, {
                x: 13,
                y: 1,
                z: 14,
                dir: 0
            }, {
                x: 13,
                y: 3,
                z: 5,
                dir: 1
            }, {
                x: 13,
                y: 3,
                z: 12,
                dir: 1
            }, {
                x: 13,
                y: 4,
                z: 6,
                dir: 1
            }, {
                x: 13,
                y: 4,
                z: 11,
                dir: 1
            }, {
                x: 13,
                y: 5,
                z: 7,
                dir: 1
            }, {
                x: 13,
                y: 5,
                z: 10,
                dir: 3
            }, {
                x: 13,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 13,
                y: 6,
                z: 9,
                dir: 0
            }, {
                x: 14,
                y: 3,
                z: 5,
                dir: 3
            }, {
                x: 14,
                y: 3,
                z: 12,
                dir: 3
            }, {
                x: 14,
                y: 4,
                z: 6,
                dir: 3
            }, {
                x: 14,
                y: 4,
                z: 11,
                dir: 2
            }, {
                x: 14,
                y: 5,
                z: 7,
                dir: 2
            }, {
                x: 14,
                y: 5,
                z: 10,
                dir: 2
            }, {
                x: 14,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 6,
                z: 9,
                dir: 3
            }, {
                x: 15,
                y: 3,
                z: 5,
                dir: 3
            }, {
                x: 15,
                y: 3,
                z: 12,
                dir: 3
            }, {
                x: 15,
                y: 4,
                z: 6,
                dir: 2
            }, {
                x: 15,
                y: 4,
                z: 11,
                dir: 1
            }, {
                x: 15,
                y: 5,
                z: 10,
                dir: 3
            }, {
                x: 15,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 15,
                y: 6,
                z: 8,
                dir: 3
            }, {
                x: 15,
                y: 6,
                z: 9,
                dir: 2
            }, {
                x: 16,
                y: 1,
                z: 14,
                dir: 3
            }, {
                x: 16,
                y: 4,
                z: 6,
                dir: 3
            }, {
                x: 16,
                y: 4,
                z: 11,
                dir: 3
            }, {
                x: 16,
                y: 5,
                z: 10,
                dir: 3
            }, {
                x: 16,
                y: 6,
                z: 7,
                dir: 2
            }, {
                x: 16,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 6,
                z: 9,
                dir: 2
            }, {
                x: 17,
                y: 1,
                z: 14,
                dir: 2
            }, {
                x: 17,
                y: 3,
                z: 5,
                dir: 1
            }, {
                x: 17,
                y: 3,
                z: 12,
                dir: 0
            }, {
                x: 17,
                y: 4,
                z: 6,
                dir: 1
            }, {
                x: 17,
                y: 4,
                z: 11,
                dir: 3
            }, {
                x: 17,
                y: 5,
                z: 10,
                dir: 0
            }, {
                x: 17,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 17,
                y: 6,
                z: 8,
                dir: 3
            }, {
                x: 17,
                y: 6,
                z: 9,
                dir: 2
            }, {
                x: 18,
                y: 3,
                z: 5,
                dir: 2
            }, {
                x: 18,
                y: 3,
                z: 12,
                dir: 0
            }, {
                x: 18,
                y: 4,
                z: 6,
                dir: 3
            }, {
                x: 18,
                y: 4,
                z: 11,
                dir: 3
            }, {
                x: 18,
                y: 5,
                z: 7,
                dir: 1
            }, {
                x: 18,
                y: 5,
                z: 10,
                dir: 2
            }, {
                x: 18,
                y: 6,
                z: 8,
                dir: 3
            }, {
                x: 18,
                y: 6,
                z: 9,
                dir: 1
            }, {
                x: 19,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 19,
                y: 3,
                z: 12,
                dir: 1
            }, {
                x: 19,
                y: 4,
                z: 6,
                dir: 2
            }, {
                x: 19,
                y: 4,
                z: 11,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 7,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 10,
                dir: 2
            }, {
                x: 19,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 19,
                y: 6,
                z: 9,
                dir: 2
            }, {
                x: 20,
                y: 3,
                z: 5,
                dir: 1
            }, {
                x: 20,
                y: 3,
                z: 12,
                dir: 1
            }, {
                x: 20,
                y: 4,
                z: 6,
                dir: 2
            }, {
                x: 20,
                y: 4,
                z: 11,
                dir: 1
            }, {
                x: 20,
                y: 5,
                z: 7,
                dir: 1
            }, {
                x: 20,
                y: 5,
                z: 10,
                dir: 1
            }, {
                x: 20,
                y: 6,
                z: 8,
                dir: 1
            }, {
                x: 20,
                y: 6,
                z: 9,
                dir: 0
            }, {
                x: 21,
                y: 3,
                z: 5,
                dir: 1
            }, {
                x: 21,
                y: 3,
                z: 12,
                dir: 0
            }, {
                x: 21,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 21,
                y: 4,
                z: 6,
                dir: 1
            }, {
                x: 21,
                y: 4,
                z: 11,
                dir: 2
            }, {
                x: 21,
                y: 5,
                z: 7,
                dir: 1
            }, {
                x: 21,
                y: 5,
                z: 10,
                dir: 1
            }, {
                x: 21,
                y: 6,
                z: 8,
                dir: 0
            }, {
                x: 21,
                y: 6,
                z: 9,
                dir: 2
            }, {
                x: 22,
                y: 3,
                z: 5,
                dir: 2
            }, {
                x: 22,
                y: 3,
                z: 6,
                dir: 1
            }, {
                x: 22,
                y: 3,
                z: 7,
                dir: 3
            }, {
                x: 22,
                y: 3,
                z: 10,
                dir: 2
            }, {
                x: 22,
                y: 3,
                z: 11,
                dir: 3
            }, {
                x: 22,
                y: 3,
                z: 12,
                dir: 3
            }, {
                x: 22,
                y: 3,
                z: 17,
                dir: 1
            }, {
                x: 22,
                y: 4,
                z: 6,
                dir: 0
            }, {
                x: 22,
                y: 4,
                z: 7,
                dir: 3
            }, {
                x: 22,
                y: 4,
                z: 10,
                dir: 1
            }, {
                x: 22,
                y: 4,
                z: 11,
                dir: 1
            }, {
                x: 22,
                y: 5,
                z: 7,
                dir: 3
            }, {
                x: 22,
                y: 5,
                z: 8,
                dir: 0
            }, {
                x: 22,
                y: 5,
                z: 9,
                dir: 2
            }, {
                x: 22,
                y: 5,
                z: 10,
                dir: 3
            }, {
                x: 22,
                y: 6,
                z: 8,
                dir: 3
            }, {
                x: 22,
                y: 6,
                z: 9,
                dir: 3
            }, {
                x: 23,
                y: 3,
                z: 17,
                dir: 0
            }]
        },
        4: {
            0: [{
                x: 17,
                y: 1,
                z: 16,
                dir: 1
            }]
        },
        5: {
            1: [{
                x: 2,
                y: 4,
                z: 2,
                dir: 1
            }, {
                x: 2,
                y: 4,
                z: 3,
                dir: 1
            }, {
                x: 2,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 2,
                y: 4,
                z: 5,
                dir: 1
            }, {
                x: 3,
                y: 5,
                z: 2,
                dir: 1
            }, {
                x: 3,
                y: 5,
                z: 3,
                dir: 1
            }, {
                x: 3,
                y: 5,
                z: 4,
                dir: 1
            }, {
                x: 3,
                y: 5,
                z: 5,
                dir: 1
            }, {
                x: 4,
                y: 5,
                z: 2,
                dir: 3
            }, {
                x: 4,
                y: 5,
                z: 3,
                dir: 3
            }, {
                x: 4,
                y: 5,
                z: 4,
                dir: 3
            }, {
                x: 4,
                y: 5,
                z: 5,
                dir: 3
            }, {
                x: 5,
                y: 4,
                z: 2,
                dir: 3
            }, {
                x: 5,
                y: 4,
                z: 3,
                dir: 3
            }, {
                x: 5,
                y: 4,
                z: 4,
                dir: 3
            }, {
                x: 5,
                y: 4,
                z: 5,
                dir: 3
            }, {
                x: 10,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 10,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 10,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 10,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 10,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 10,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 10,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 10,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 11,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 11,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 11,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 11,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 11,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 11,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 11,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 11,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 12,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 12,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 12,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 12,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 12,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 12,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 12,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 13,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 13,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 13,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 13,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 13,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 13,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 13,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 13,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 14,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 14,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 14,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 14,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 14,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 14,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 14,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 14,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 15,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 15,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 15,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 15,
                y: 6,
                z: 6,
                dir: 0
            }, {
                x: 15,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 15,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 15,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 16,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 16,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 16,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 16,
                y: 6,
                z: 6,
                dir: 0
            }, {
                x: 16,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 16,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 17,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 17,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 17,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 17,
                y: 6,
                z: 6,
                dir: 0
            }, {
                x: 17,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 17,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 17,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 18,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 18,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 18,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 18,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 18,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 18,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 18,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 18,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 19,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 19,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 19,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 19,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 19,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 19,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 19,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 19,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 20,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 20,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 20,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 20,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 20,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 20,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 20,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 20,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 21,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 21,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 21,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 21,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 21,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 21,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 21,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 21,
                y: 7,
                z: 9,
                dir: 2
            }, {
                x: 22,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 22,
                y: 4,
                z: 12,
                dir: 2
            }, {
                x: 22,
                y: 5,
                z: 6,
                dir: 0
            }, {
                x: 22,
                y: 5,
                z: 11,
                dir: 2
            }, {
                x: 22,
                y: 6,
                z: 7,
                dir: 0
            }, {
                x: 22,
                y: 6,
                z: 10,
                dir: 2
            }, {
                x: 22,
                y: 7,
                z: 8,
                dir: 0
            }, {
                x: 22,
                y: 7,
                z: 9,
                dir: 2
            }],
            2: [{
                x: 21,
                y: 3,
                z: 16,
                dir: 0
            }, {
                x: 21,
                y: 3,
                z: 18,
                dir: 2
            }, {
                x: 22,
                y: 3,
                z: 16,
                dir: 0
            }, {
                x: 23,
                y: 3,
                z: 16,
                dir: 0
            }, {
                x: 23,
                y: 3,
                z: 18,
                dir: 2
            }]
        },
        6: {
            0: [{
                x: 2,
                y: 3,
                z: 12,
                dir: 1
            }, {
                x: 2,
                y: 3,
                z: 17,
                dir: 1
            }, {
                x: 2,
                y: 4,
                z: 17,
                dir: 1
            }, {
                x: 3,
                y: 4,
                z: 10,
                dir: 1
            }, {
                x: 6,
                y: 3,
                z: 14,
                dir: 0
            }, {
                x: 6,
                y: 4,
                z: 18,
                dir: 3
            }, {
                x: 6,
                y: 5,
                z: 18,
                dir: 3
            }, {
                x: 7,
                y: 3,
                z: 9,
                dir: 3
            }, {
                x: 10,
                y: 1,
                z: 17,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 17,
                dir: 1
            }, {
                x: 10,
                y: 3,
                z: 17,
                dir: 1
            }, {
                x: 11,
                y: 4,
                z: 17,
                dir: 2
            }, {
                x: 11,
                y: 5,
                z: 16,
                dir: 3
            }, {
                x: 13,
                y: 3,
                z: 9,
                dir: 1
            }, {
                x: 14,
                y: 3,
                z: 17,
                dir: 1
            }, {
                x: 14,
                y: 4,
                z: 17,
                dir: 1
            }, {
                x: 18,
                y: 4,
                z: 17,
                dir: 2
            }, {
                x: 19,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 19,
                y: 3,
                z: 17,
                dir: 3
            }, {
                x: 19,
                y: 4,
                z: 8,
                dir: 3
            }, {
                x: 22,
                y: 1,
                z: 18,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 18,
                dir: 0
            }, {
                x: 23,
                y: 3,
                z: 2,
                dir: 2
            }]
        },
        10: {
            0: [{
                x: 0,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 1,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 3,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 4,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 8,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 9,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 10,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 11,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 12,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 13,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 14,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 15,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 16,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 17,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 18,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 19,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 20,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 21,
                dir: 0
            }, {
                x: 0,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 0,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 0,
                y: 4,
                z: 1,
                dir: 0
            }, {
                x: 0,
                y: 4,
                z: 2,
                dir: 3
            }, {
                x: 0,
                y: 4,
                z: 3,
                dir: 1
            }, {
                x: 0,
                y: 4,
                z: 4,
                dir: 2
            }, {
                x: 0,
                y: 4,
                z: 5,
                dir: 2
            }, {
                x: 0,
                y: 4,
                z: 6,
                dir: 0
            }, {
                x: 0,
                y: 4,
                z: 7,
                dir: 3
            }, {
                x: 0,
                y: 4,
                z: 15,
                dir: 0
            }, {
                x: 0,
                y: 4,
                z: 16,
                dir: 1
            }, {
                x: 0,
                y: 4,
                z: 17,
                dir: 2
            }, {
                x: 0,
                y: 4,
                z: 18,
                dir: 1
            }, {
                x: 0,
                y: 4,
                z: 19,
                dir: 1
            }, {
                x: 0,
                y: 4,
                z: 20,
                dir: 0
            }, {
                x: 0,
                y: 4,
                z: 21,
                dir: 3
            }, {
                x: 0,
                y: 4,
                z: 22,
                dir: 1
            }, {
                x: 0,
                y: 5,
                z: 0,
                dir: 2
            }, {
                x: 0,
                y: 5,
                z: 1,
                dir: 2
            }, {
                x: 0,
                y: 5,
                z: 2,
                dir: 1
            }, {
                x: 0,
                y: 5,
                z: 3,
                dir: 2
            }, {
                x: 0,
                y: 5,
                z: 4,
                dir: 0
            }, {
                x: 0,
                y: 5,
                z: 5,
                dir: 1
            }, {
                x: 0,
                y: 5,
                z: 6,
                dir: 3
            }, {
                x: 0,
                y: 5,
                z: 16,
                dir: 2
            }, {
                x: 0,
                y: 5,
                z: 17,
                dir: 3
            }, {
                x: 0,
                y: 5,
                z: 18,
                dir: 0
            }, {
                x: 0,
                y: 5,
                z: 19,
                dir: 3
            }, {
                x: 0,
                y: 5,
                z: 20,
                dir: 3
            }, {
                x: 0,
                y: 5,
                z: 21,
                dir: 2
            }, {
                x: 0,
                y: 5,
                z: 22,
                dir: 0
            }, {
                x: 1,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 1,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 1,
                y: 4,
                z: 0,
                dir: 2
            }, {
                x: 1,
                y: 4,
                z: 22,
                dir: 0
            }, {
                x: 1,
                y: 5,
                z: 0,
                dir: 3
            }, {
                x: 1,
                y: 5,
                z: 22,
                dir: 3
            }, {
                x: 1,
                y: 6,
                z: 0,
                dir: 2
            }, {
                x: 2,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 2,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 2,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 2,
                y: 4,
                z: 22,
                dir: 2
            }, {
                x: 2,
                y: 5,
                z: 0,
                dir: 1
            }, {
                x: 2,
                y: 5,
                z: 22,
                dir: 2
            }, {
                x: 2,
                y: 6,
                z: 0,
                dir: 1
            }, {
                x: 3,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 3,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 3,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 3,
                y: 4,
                z: 22,
                dir: 3
            }, {
                x: 3,
                y: 5,
                z: 0,
                dir: 1
            }, {
                x: 3,
                y: 5,
                z: 22,
                dir: 2
            }, {
                x: 3,
                y: 6,
                z: 0,
                dir: 2
            }, {
                x: 4,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 4,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 4,
                y: 4,
                z: 0,
                dir: 3
            }, {
                x: 4,
                y: 4,
                z: 22,
                dir: 2
            }, {
                x: 4,
                y: 5,
                z: 0,
                dir: 1
            }, {
                x: 4,
                y: 5,
                z: 22,
                dir: 0
            }, {
                x: 4,
                y: 6,
                z: 0,
                dir: 1
            }, {
                x: 5,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 5,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 5,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 5,
                y: 4,
                z: 22,
                dir: 3
            }, {
                x: 5,
                y: 5,
                z: 0,
                dir: 3
            }, {
                x: 5,
                y: 5,
                z: 22,
                dir: 3
            }, {
                x: 5,
                y: 6,
                z: 0,
                dir: 1
            }, {
                x: 6,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 6,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 6,
                y: 4,
                z: 0,
                dir: 2
            }, {
                x: 6,
                y: 4,
                z: 22,
                dir: 3
            }, {
                x: 6,
                y: 5,
                z: 0,
                dir: 0
            }, {
                x: 6,
                y: 5,
                z: 22,
                dir: 2
            }, {
                x: 6,
                y: 6,
                z: 0,
                dir: 2
            }, {
                x: 7,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 7,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 7,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 7,
                y: 4,
                z: 22,
                dir: 0
            }, {
                x: 7,
                y: 5,
                z: 0,
                dir: 3
            }, {
                x: 7,
                y: 5,
                z: 22,
                dir: 1
            }, {
                x: 8,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 8,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 8,
                y: 4,
                z: 0,
                dir: 2
            }, {
                x: 8,
                y: 4,
                z: 22,
                dir: 0
            }, {
                x: 8,
                y: 5,
                z: 22,
                dir: 0
            }, {
                x: 9,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 9,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 9,
                y: 4,
                z: 22,
                dir: 3
            }, {
                x: 9,
                y: 5,
                z: 22,
                dir: 1
            }, {
                x: 10,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 10,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 10,
                y: 4,
                z: 22,
                dir: 0
            }, {
                x: 10,
                y: 5,
                z: 22,
                dir: 0
            }, {
                x: 11,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 11,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 11,
                y: 4,
                z: 0,
                dir: 3
            }, {
                x: 11,
                y: 4,
                z: 22,
                dir: 0
            }, {
                x: 11,
                y: 5,
                z: 22,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 12,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 12,
                y: 4,
                z: 22,
                dir: 0
            }, {
                x: 12,
                y: 5,
                z: 22,
                dir: 1
            }, {
                x: 13,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 13,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 13,
                y: 4,
                z: 0,
                dir: 3
            }, {
                x: 13,
                y: 4,
                z: 22,
                dir: 1
            }, {
                x: 13,
                y: 5,
                z: 22,
                dir: 1
            }, {
                x: 14,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 14,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 14,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 14,
                y: 4,
                z: 22,
                dir: 0
            }, {
                x: 14,
                y: 5,
                z: 22,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 15,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 15,
                y: 4,
                z: 22,
                dir: 2
            }, {
                x: 16,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 16,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 16,
                y: 4,
                z: 0,
                dir: 2
            }, {
                x: 16,
                y: 4,
                z: 22,
                dir: 1
            }, {
                x: 17,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 17,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 17,
                y: 4,
                z: 0,
                dir: 3
            }, {
                x: 17,
                y: 4,
                z: 22,
                dir: 1
            }, {
                x: 18,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 18,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 18,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 18,
                y: 4,
                z: 22,
                dir: 0
            }, {
                x: 19,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 19,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 19,
                y: 4,
                z: 0,
                dir: 3
            }, {
                x: 19,
                y: 4,
                z: 22,
                dir: 1
            }, {
                x: 20,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 20,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 20,
                y: 4,
                z: 0,
                dir: 1
            }, {
                x: 21,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 21,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 21,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 22,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 22,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 22,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 23,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 23,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 23,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 24,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 24,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 24,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 25,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 25,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 25,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 0,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 1,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 2,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 3,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 4,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 8,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 9,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 10,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 11,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 12,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 13,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 14,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 15,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 16,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 17,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 18,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 19,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 20,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 21,
                dir: 0
            }, {
                x: 26,
                y: 3,
                z: 22,
                dir: 0
            }, {
                x: 26,
                y: 4,
                z: 0,
                dir: 0
            }, {
                x: 26,
                y: 4,
                z: 1,
                dir: 0
            }, {
                x: 26,
                y: 4,
                z: 2,
                dir: 0
            }, {
                x: 26,
                y: 4,
                z: 3,
                dir: 0
            }, {
                x: 26,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 26,
                y: 4,
                z: 5,
                dir: 0
            }, {
                x: 26,
                y: 4,
                z: 6,
                dir: 3
            }, {
                x: 26,
                y: 4,
                z: 7,
                dir: 3
            }, {
                x: 26,
                y: 4,
                z: 8,
                dir: 2
            }, {
                x: 26,
                y: 4,
                z: 9,
                dir: 0
            }, {
                x: 26,
                y: 4,
                z: 10,
                dir: 0
            }, {
                x: 26,
                y: 4,
                z: 11,
                dir: 0
            }, {
                x: 26,
                y: 5,
                z: 7,
                dir: 1
            }, {
                x: 26,
                y: 5,
                z: 8,
                dir: 3
            }, {
                x: 26,
                y: 5,
                z: 9,
                dir: 0
            }, {
                x: 26,
                y: 5,
                z: 10,
                dir: 2
            }, {
                x: 26,
                y: 6,
                z: 8,
                dir: 2
            }, {
                x: 26,
                y: 6,
                z: 9,
                dir: 1
            }]
        }
    },
    width: 27,
    height: 8,
    depth: 23,
    name: "",
    surfaceArea: 489
}];
MunitionsManager.prototype.update = function (e) {
    for (var i = 0; i < 4; i++) this.bulletPool.forEachActive(function (i) {
        i.update(.25 * e);
        for (var t = 0; t < 20; t++) {
            var r = players[t];
            if (r && !r.isDead() && r.id != i.player.id && (0 == r.team || r.team != i.player.team) && Math.abs(i.x - r.x) < .3 && Math.abs(i.y - (r.y + .3)) < .3 && Math.abs(i.z - r.z) < .3) {
                var d = i.player;
                v1.x = i.dx, v1.y = i.dy, v1.z = i.dz, v2.x = r.x - i.x, v2.y = r.y + .32 - i.y, v2.z = r.z - i.z;
                var a = BABYLON.Vector3.Cross(v1, v2),
                    n = i.damage / (1 + 20 * a.length());
                NaN == n && (log.out("Invisibility bug caught in bullet damage calculation!"), n = i.damage), hitPlayer(r, d, n, v1.x, v1.z), i.remove()
            }
        }
    });
    this.grenadePool.forEachActive(function (i) {
        i.update(e)
    })
}, MunitionsManager.prototype.fireBullet = function (e, i, t, r, d, a) {
    this.bulletPool.retrieve().fire(e, i, t, r, d, a)
}, MunitionsManager.prototype.throwGrenade = function (e, i, t) {
    this.grenadePool.retrieve().throw(e, i, t)
};
var CONTROL = {
        up: 1,
        down: 2,
        left: 4,
        right: 8
    },
    classes = [{
        name: "Soldier",
        weapon: Eggk47
    }, {
        name: "Scrambler",
        weapon: DozenGauge
    }, {
        name: "Free Ranger",
        weapon: CSG1
    }],
    stateBufferSize = 256;
Player.prototype.update = function (e, i) {
    var t = 0,
        r = 0,
        d = 0;
    if (this.controlKeys & CONTROL.left && (t -= Math.cos(this.moveYaw), d += Math.sin(this.moveYaw)), this.controlKeys & CONTROL.right && (t += Math.cos(this.moveYaw), d -= Math.sin(this.moveYaw)), this.controlKeys & CONTROL.up && (this.climbing ? r += 1 : (t += Math.sin(this.moveYaw), d += Math.cos(this.moveYaw))), this.controlKeys & CONTROL.down && (this.climbing ? r -= 1 : (t -= Math.sin(this.moveYaw), d -= Math.cos(this.moveYaw))), this.climbing) {
        this.jumping = !1;
        o = this.dy;
        this.dy += .014 * r * e;
        x = .5 * (this.dy + o) * e;
        this.y += x, this.dy *= Math.pow(.5, e), this.getOccupiedCell().cat != MAP.ladder && (this.y = Math.round(this.y), this.climbing = !1), this.collidesWithMap() && x > 0 && this.y % 1 > .3 && (this.y -= x, this.dy *= .5)
    } else {
        var a = new BABYLON.Vector3(t, r, d).normalize(),
            n = this.dx,
            o = this.dy,
            s = this.dz;
        this.dx += .007 * a.x * e, this.dz += .007 * a.z * e, this.dy -= .003 * e, this.dy = Math.max(-.2, this.dy);
        var y = .5 * (this.dx + n) * e,
            x = .5 * (this.dy + o) * e,
            l = .5 * (this.dz + s) * e;
        this.moveX(y, e), this.moveZ(l, e), this.moveY(x, e)
    }
    if (!i) {
        this.shield > 0 && !this.isDead() && (this.shield -= e, (0 != t || 0 != r || this.shield <= 0) && this.disableShield());
        var z = Math.length3(this.dx, this.dy, this.dz);
        this.actor && this.id == meId && (z *= .75), (this.climbing || this.jumping) && (z *= 2), this.bobble = (this.bobble + 7 * z) % Math.PI2, this.shotSpread += Math.floor(150 * z * e);
        var c = Math.pow(this.weapon.subClass.accuracySettleFactor, e);
        this.shotSpread = Math.max(this.shotSpread * c - 4 * (1 - c), 0), this.weapon && this.weapon.update(e), this.hp > 0 && (this.hp = Math.min(100, this.hp + .05 * e)), this.swapWeaponCountdown > 0 && (this.shotSpread = this.weapon.subClass.shotSpreadIncrement, this.swapWeaponCountdown -= e, !this.actor && this.swapWeaponCountdown <= 0 && (this.swapWeaponCountdown = 0, this.weaponIdx = this.equipWeaponIdx, this.weapon = this.weapons[this.weaponIdx])), this.reloadCountdown > 0 && (this.shotSpread = this.weapon.subClass.shotSpreadIncrement, this.reloadCountdown -= e, this.reloadCountdown <= 0 && (this.reloadCountdown = 0, this.reloaded())), this.rofCountdown > 0 && (this.rofCountdown = Math.max(this.rofCountdown - e, 0)), this.recoilCountdown > 0 && (this.recoilCountdown = Math.max(this.recoilCountdown - e, 0)), this.teamSwitchCooldown > 0 && (this.teamSwitchCooldown = Math.max(this.teamSwitchCooldown - e, 0), this.actor && this.id == meId && 0 == this.teamSwitchCooldown && (document.getElementById("switchTeamButton").style.opacity = 1, document.getElementById("switchTeamButton").style.pointerEvents = "all")), this.grenadeCountdown > 0 && (this.grenadeCountdown -= e, this.grenadeCountdown <= 0 && this.grenadesQueued > 0 && !this.actor && this.throwGrenade()), this.chatLineCap = Math.min(this.chatLineCap + e / 120, 2), this.triggerPulled && this.fire()
    }
    this.dx *= Math.pow(.8, e), this.dz *= Math.pow(.8, e), this.actor || (this.shotsQueued > 0 && this.fire(), this.reloadsQueued > 0 && this.reload(), this.weaponSwapsQueued > 0 && this.swapWeapon(this.equipWeaponIdx))
}, Player.prototype.disableShield = function () {
    this.shield = 0, this.actor && (this.actor.bodyMesh.renderOverlay = !1, this.actor.hands.renderOverlay = !1)
}, Player.prototype.enableShield = function () {
    this.shield = 120, this.actor && (this.actor.bodyMesh.renderOverlay = !0, this.actor.hands.renderOverlay = !0)
}, Player.prototype.resetStateBuffer = function () {
    for (var e = 0; e < stateBufferSize; e++) this.previousStates[e] = {
        delta: 0,
        moveYaw: this.moveYaw,
        fire: !1,
        jump: !1,
        jumping: !1,
        climbing: !1,
        x: this.x,
        y: this.y,
        z: this.z,
        dx: 0,
        dy: 0,
        dz: 0,
        controlKeys: 0
    }
}, Player.prototype.moveX = function (e, i) {
    if (this.x += e, this.collidesWithMap()) {
        var t = this.y;
        this.y += Math.abs(e) + .01 * i, this.collidesWithMap() && (this.x -= e, this.dx *= .5, this.y = t), this.lookForLadder()
    }
}, Player.prototype.moveZ = function (e, i) {
    if (this.z += e, this.collidesWithMap()) {
        var t = this.y;
        this.y += Math.abs(e) + .01 * i, this.collidesWithMap() && (this.z -= e, this.dz *= .5, this.y = t), this.lookForLadder()
    }
}, Player.prototype.moveY = function (e, i) {
    this.y += e, this.collidesWithMap() ? (e < 0 && (this.jumping = !1), this.y -= e, this.dy *= Math.pow(.5, i)) : 0 == this.jumping && (this.jumping = !0)
}, Player.prototype.canJump = function () {
    var e = !this.jumping | this.climbing;
    return e || (this.y -= .2, this.collidesWithMap() && (e = !0), this.y += .2), e
}, Player.prototype.jump = function () {
    this.canJump() && (this.climbing ? (this.dy = .03, this.climbing = !1) : this.dy = .06, this.jumping = !0)
}, Player.prototype.changeCharacter = function (e, i, t, r, d) {
    if (e != this.charClass) {
        if (this.actor) this.weapons[0].actor.dispose(), this.weapons[1].actor.dispose(), this.id == meId && ((a = new Comm.output(6)).packInt8(Comm.changeCharacter), a.packInt8(e), a.packInt8(i), a.packInt8(t), a.packInt8(r), a.packInt8(d), ws.send(a.buffer));
        else {
            var a = new Comm.output(7);
            a.packInt8(Comm.changeCharacter), a.packInt8(this.id), a.packInt8(e), a.packInt8(i), a.packInt8(t), a.packInt8(r), a.packInt8(d), sendToOthers(a.buffer, this.id)
        }
        this.charClass = e, this.weapons[0] = new Weapons[this.charClass][0][r].class(this), this.weapons[1] = new Weapons[this.charClass][1][d].class(this), this.weapon = this.weapons[0]
    }
}, Player.prototype.swapWeapon = function (e) {
    if (this.actor && this.id != meId || this.canSwapOrReload())
        if (this.equipWeaponIdx = e, this.triggerPulled = !1, this.swapWeaponCountdown = this.weapon.stowWeaponTime + this.weapons[e].equipTime, this.actor) {
            if (this.weapon.actor.stow(), this.id == meId) {
                var i = new Comm.output(2);
                i.packInt8(Comm.swapWeapon), i.packInt8(e), ws.send(i.buffer)
            }
        } else this.swapWeaponCountdown *= .9, this.weaponSwapsQueued--, (i = new Comm.output(3)).packInt8(Comm.swapWeapon), i.packInt8(this.id), i.packInt8(e), sendToOthers(i.buffer, this.id)
}, Player.prototype.addRotationShotSpread = function (e, i) {
    this.shotSpread += Math.sqrt(Math.pow(60 * e, 2) + Math.pow(60 * i, 2))
}, Player.prototype.collectItem = function (e, i) {
    switch (e) {
        case ItemManager.AMMO:
            return !!this.weapons[i].collectAmmo() && (this.actor && (Sounds.ammo.play(), updateAmmoUi()), !0);
        case ItemManager.GRENADE:
            return this.grenadeCount < this.grenadeCapacity && (this.grenadeCount++, this.actor && (Sounds.ammo.play(), updateAmmoUi()), !0)
    }
}, Player.prototype.isAtReady = function (e) {
    return !(!(!this.isDead() && this.weapon && this.reloadCountdown <= 0 && this.swapWeaponCountdown <= 0 && this.grenadeCountdown <= 0) || this.actor && 0 != grenadePowerUp)
}, Player.prototype.canSwapOrReload = function () {
    return !(!(!this.isDead() && this.weapon && this.recoilCountdown <= 0 && this.reloadCountdown <= 0 && this.swapWeaponCountdown <= 0 && this.grenadeCountdown <= 0) || this.actor && 0 != grenadePowerUp)
}, Player.prototype.fire = function () {
    if (this.shield > 0 && this.disableShield(), this.isAtReady() && this.rofCountdown <= 0)
        if (this.weapon.ammo.rounds > 0)
            if (this.weapon.fire(), this.weapon.ammo.rounds--, this.recoilCountdown = this.weapon.subClass.rof / 3, this.rofCountdown = this.weapon.subClass.rof, this.shotSpread += this.weapon.subClass.shotSpreadIncrement, 0 == this.weapon.subClass.automatic && (this.triggerPulled = !1), this.actor) {
                this.actor.fire(), this.id == meId && updateAmmoUi();
                var e = BABYLON.Matrix.RotationYawPitchRoll(this.viewYaw, this.pitch, 0),
                    i = BABYLON.Matrix.Translation(0, 0, this.weapon.highPrecision ? 2e3 : 100).multiply(e).getTranslation();
                if (this.weapon.highPrecision)(t = new Comm.output(13)).packInt8(Comm.firePrecise), t.packDouble(i.x), t.packDouble(i.y), t.packDouble(i.z), ws.send(t.buffer);
                else {
                    var t = new Comm.output(7);
                    t.packInt8(Comm.fire), t.packFloat(i.x), t.packFloat(i.y), t.packFloat(i.z), ws.send(t.buffer)
                }
            } else this.recoilCountdown *= .9, this.rofCountdown *= .9, this.shotsQueued--;
    else this.weapon.actor && (this.weapon.actor.dryFire(), this.triggerPulled = !1)
}, Player.prototype.pullTrigger = function () {
    1 == grenadePowerUp && me.grenadeCountdown <= 0 ? this.cancelGrenade() : this.isAtReady() && this.rofCountdown <= 0 && (this.weapon.ammo.rounds > 0 ? (this.triggerPulled = !0, this.fire()) : this.weapon.ammo.store > 0 ? this.reload() : this.weapon.actor.dryFire())
}, Player.prototype.releaseTrigger = function () {
    this.triggerPulled = !1
}, Player.prototype.reload = function () {
    if (this.actor && this.id != meId) this.weapon.actor.reload();
    else if (this.weapon.ammo.rounds != this.weapon.ammo.capacity && 0 != this.weapon.ammo.store && this.canSwapOrReload()) {
        var e = Math.min(Math.min(this.weapon.ammo.capacity, this.weapon.ammo.reload) - this.weapon.ammo.rounds, this.weapon.ammo.store);
        if (this.roundsToReload = e, this.actor) this.weapon.actor.reload(), this.triggerPulled = !1, (i = new Comm.output(1)).packInt8(Comm.reload), ws.send(i.buffer), this.weapon.ammo.store -= e;
        else {
            var i = new Comm.output(2);
            i.packInt8(Comm.reload), i.packInt8(this.id), sendToOthers(i.buffer, this.id), this.reloadsQueued--
        }
        0 == this.weapon.ammo.rounds ? this.reloadCountdown = this.weapon.longReloadTime : this.reloadCountdown = this.weapon.shortReloadTime, this.actor || (this.reloadCountdown *= .9)
    }
}, Player.prototype.reloaded = function () {
    this.weapon.ammo.rounds += this.roundsToReload, this.actor ? this.id == meId && updateAmmoUi() : this.weapon.ammo.store -= this.roundsToReload
}, Player.prototype.queueGrenade = function (e) {
    this.grenadesQueued++, this.grenadeThrowPower = Math.clamp(e, 0, 1), this.grenadeCountdown = 20, this.actor || (this.grenadeCountdown *= .9)
}, Player.prototype.cancelGrenade = function () {
    grenadePowerUp = !1, me.grenadeCountdown = 30, this.id == meId && (document.getElementById("grenadeThrowContainer").style.visibility = "hidden")
}, Player.prototype.throwGrenade = function () {
    if (this.shield > 0 && this.disableShield(), this.actor) {
        var e = new Comm.output(3);
        e.packInt8(Comm.throwGrenade), e.packFloat(Math.clamp(grenadeThrowPower, 0, 1)), ws.send(e.buffer), me.grenadeCountdown = 60, this.actor.reachForGrenade()
    } else if (this.isAtReady() && this.grenadeCount > 0) {
        this.grenadeCount--, this.grenadesQueued--, this.grenadeCountdown = 54;
        var i = BABYLON.Matrix.RotationYawPitchRoll(this.viewYaw, this.pitch, 0),
            t = BABYLON.Matrix.Translation(0, .1, 1).multiply(i).getTranslation(),
            r = BABYLON.Matrix.Translation(.1, -.05, .2),
            d = (r = (r = r.multiply(i)).add(BABYLON.Matrix.Translation(this.x, this.y + .3, this.z))).getTranslation(),
            a = .1 * this.grenadeThrowPower + .1;
        t.x *= a, t.y *= a, t.z *= a, (e = new Comm.output(14)).packInt8(Comm.throwGrenade), e.packInt8(this.id), e.packFloat(d.x), e.packFloat(d.y), e.packFloat(d.z), e.packFloat(t.x), e.packFloat(t.y), e.packFloat(t.z), sendToAll(e.buffer), munitionsManager.throwGrenade(this, d, t)
    }
}, Player.prototype.die = function () {
    this.hp = 0, this.killStreak = 0, this.controlKeys = 0, this.shotSpread = 0, this.jumping = !1, this.climbing = !1, this.resetWeaponState(), this.actor && (this.actor.die(), this.id == meId && (grenadePowerUp = !1))
}, Player.prototype.respawn = function (e, i, t, r) {
    this.x = e, this.y = i, this.z = t, this.hp = 100, this.respawnQueued = !1, this.resetWeaponState(r), this.actor && (this.resetStateBuffer(), this.actor.mesh.position.x = e, this.actor.mesh.position.y = i, this.actor.mesh.position.z = t, this.actor.respawn(), this.weapon.equip(), this.id == meId && updateAmmoUi()), this.enableShield()
}, Player.prototype.resetWeaponState = function (e) {
    if (this.rofCountdown = 0, this.triggerPulled = !1, this.shotsQueued = 0, this.reloadsQueued = 0, this.recoilCountdown = 0, this.reloadCountdown = 0, this.swapWeaponCountdown = 0, this.weaponSwapsQueued = 0, this.shotSpread = 0, this.weaponIdx = 0, this.grenadeCountdown = 0, this.grenadesQueued = 0, !e) {
        for (var i = 0; i < this.weapons.length; i++) this.weapons[i] && (this.weapons[i].ammo.rounds = this.weapons[i].ammo.capacity, this.weapons[i].ammo.store = this.weapons[i].ammo.storeMax);
        this.grenadeCount = Math.max(this.grenadeCount, 1)
    }
}, Player.prototype.isDead = function () {
    return this.hp <= 0
}, Player.prototype.lookForLadder = function () {
    if (this.controlKeys & CONTROL.up) {
        var e = this.getOccupiedCell();
        if (e.cat == MAP.ladder) {
            var i = this.x % 1,
                t = this.z % 1;
            if (Math.abs(Math.radDifference(Math.cardToRad(e.dir), this.moveYaw)) < Math.PI90 / 3) switch (e.dir) {
                case 0:
                    i > .3 && i < .7 && t > .5 && (this.z = Math.floor(this.z) + .74, this.climbing = !0, this.jumping = !1);
                    break;
                case 1:
                    t > .3 && t < .7 && i > .5 && (this.x = Math.floor(this.x) + .74, this.climbing = !0, this.jumping = !1);
                    break;
                case 2:
                    i > .3 && i < .7 && t < .5 && (this.z = Math.floor(this.z) + .26, this.climbing = !0, this.jumping = !1);
                    break;
                case 3:
                    t > .3 && t < .7 && i < .5 && (this.x = Math.floor(this.x) + .26, this.climbing = !0, this.jumping = !1)
            }
        }
    }
}, Player.prototype.getOccupiedCell = function () {
    if (this.x < 0 || this.y < 0 || this.z < 0 || this.x >= map.width || this.y >= map.height || this.z > map.depth) return {};
    var e = Math.floor(this.x),
        i = Math.floor(this.y),
        t = Math.floor(this.z);
    return map.data[e][i][t]
}, Player.prototype.collidesWithMap = function () {
    var e = this.x - .5,
        i = this.y,
        t = this.z - .5;
    if (i > map.height) return !1;
    if (i < 0) return !0;
    if (e < -.25 || t < -.25 || e > map.width - .75 || t > map.depth - .75) return !0;
    for (var r, d, a, n, o, s, y, x, l, z = .25; z <= .75; z += .25)
        for (var c = 0; c <= .6; c += .3)
            for (var h = .25; h <= .75; h += .25)
                if (r = e + z, d = i + c, a = t + h, n = Math.floor(r), o = Math.floor(d), s = Math.floor(a), n >= 0 && o >= 0 && s >= 0 && n < map.width && o < map.height && s < map.depth) {
                    var m = map.data[n][o][s];
                    if (m.cat == MAP.ground || m.cat == MAP.block) return m;
                    if (m.cat == MAP.ramp) switch (y = r % 1, x = d % 1, l = a % 1, m.dir) {
                        case 0:
                            if (x < l) return m;
                            break;
                        case 2:
                            if (x < 1 - l) return m;
                            break;
                        case 1:
                            if (x < y) return m;
                            break;
                        case 3:
                            if (x < 1 - y) return m
                    } else if (m.cat == MAP.halfBlock) {
                        if (y = r % 1, x = d % 1, l = a % 1, y < .7 && y > .3 && l < .7 && l > .3 && x < .5) return m
                    } else if (m.cat == MAP.barrier) {
                        if (y = r % 1, x = d % 1, l = a % 1, y < .76 && y > .24 && l < .76 && l > .24 && x < .76) return m
                    } else if (m.cat == MAP.column) {
                        if (y = r % 1 - .5, l = a % 1 - .5, y * y + l * l < .04) return m
                    } else if (m.cat == MAP.tank) {
                        if (y = r % 1 - .5, x = d % 1 - .5, l = a % 1 - .5, x < .2) return m;
                        if (0 == m.dir || 2 == m.dir) {
                            if (y * y + x * x < .25) return m
                        } else if (l * l + x * x < .25) return m
                    } else if (m.cat == MAP.lowWall && (y = r % 1, x = d % 1, l = a % 1, x < .25)) switch (m.dir) {
                        case 0:
                            if (l > .75) return m;
                            break;
                        case 1:
                            if (y > .75) return m;
                            break;
                        case 2:
                            if (l < .25) return m;
                            break;
                        case 3:
                            if (y < .25) return m
                    }
                } return !1
}, Pool.prototype.expand = function (e) {
    for (var i = 0; i < e; i++) {
        var t = this.constructorFn();
        t.id = i + this.size, t.active = !1, this.objects.push(t)
    }
    this.size += e
}, Pool.prototype.retrieve = function (e) {
    if (void 0 != e) {
        for (; e >= this.size;) this.expand(this.originalSize);
        return this.numActive++, this.objects[e].active = !0, this.objects[e]
    }
    var i = this.idx;
    do {
        i = (i + 1) % this.size;
        var t = this.objects[i];
        if (!t.active) return this.idx = i, this.numActive++, t.active = !0, t
    } while (i != this.idx);
    return this.expand(this.originalSize), this.retrieve()
}, Pool.prototype.recycle = function (e) {
    e.active = !1, this.numActive--
}, Pool.prototype.forEachActive = function (e) {
    for (var i = 0; i < this.size; i++) {
        var t = this.objects[i];
        !0 === t.active && e(t, i)
    }
};