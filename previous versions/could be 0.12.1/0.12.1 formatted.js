"use strict";

function BulletActor(e) {
    this.bullet = e, this.mesh = Meshes.bullet.createInstance(""), this.mesh.setEnabled(!1)
}

function loadResources(e) {
    Meshes = {}, Materials = {}, Sounds = {}, loadMaterials(), loadSounds(), loadObjectMeshes(function () {
        loadMapMeshes(function () {
            e()
        })
    })
}

function setupLights() {
    scene.ambientColor = new BABYLON.Color3(.2, .2, .2), scene.fogMode = BABYLON.Scene.FOGMODE_EXP, scene.fogColor = new BABYLON.Color4(.5, .7, .9, 1), scene.fogDensity = .025, scene.clearColor = BABYLON.Color3.Black();
    var e = new BABYLON.DirectionalLight("", new BABYLON.Vector3(0, -1, 0), scene);
    e.intensity = 1.2, e.autoUpdateExtends = !1, e.shadowMinZ = .05, e.shadowMaxZ = 40, e.shadowFrustumSize = 15, (shadowGen = new BABYLON.ShadowGenerator(1024, e)).forceBackFacesOnly = !0;
    var i = new BABYLON.HemisphericLight("light2", new BABYLON.Vector3(-.25, 1, -.5), scene);
    return i.intensity = .8, (i = new BABYLON.HemisphericLight("light3", new BABYLON.Vector3(0, -1, 0), scene)).intensity = .25, e
}

function beginAnimation(e, i, t, r, a) {
    scene.beginAnimation(e, i, t, r, a);
    for (var n = e.getChildMeshes(), o = 0; o < n.length; o++) scene.beginAnimation(n[o], i, t, r, a)
}

function startGame() {
    highestPing = 0, players = [], keyIsDown = {}, inputTally = "WASDERQ ", respawnTime = 0, me = null, lastTimeStamp = Date.now(), lastDelta = 0, fps = Array(60).fill(0), fpsSum = 0, fpsIdx = 0, pingTotal = 0, pingSamples = 0, fpsTotal = 0, fpsSamples = 0, kills = 0, deaths = 0, bestKillStreak = 0, gameStartTime = Date.now(), nextPingSample = Date.now() + 1e3, engine.clear(BABYLON.Color3.Black()), engine.stopRenderLoop(), scene = new BABYLON.Scene(engine), settings.autoDetail || (scene.shadowsEnabled = settings.shadowsEnabled), scene.autoClear = !1, scene.autoClearDepthAndStencil = !1, scene.setRenderingAutoClearDepthStencil(0, !1), scene.setRenderingAutoClearDepthStencil(1, !0, !0, !1), settings.autoDetail && enableAutoDetail(), light = setupLights(), camera = new BABYLON.TargetCamera("camera", BABYLON.Vector3.Zero(), scene), scene.activeCameras.push(camera), camera.maxZ = 1e3, camera.fov = 1.25, camera.minZ = .08, (uiCamera = new BABYLON.FreeCamera("uiCamera", new BABYLON.Vector3(0, 0, -1), scene)).mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA, uiCamera.layerMask = 536870912, scene.activeCameras.push(uiCamera), window.onfocus = function () {
        lastTimeStamp = Date.now()
    }, window.onblur = function () {
        document.exitPointerLock()
    }, chatInEl = document.getElementById("chatIn"), chatOutEl = document.getElementById("chatOut"), killEl = document.getElementById("killTicker"), chatOutEl.innerHTML = "", killEl.innerHTML = "", 1 == settings.enableChat && (initChatIn(), chatOutEl.style.display = "block", chatInEl.style.display = "block"), loadResources(onLoadingComplete)
}

function onCanvasClick() {
    if (this.requestPointerLock = this.requestPointerLock || this.mozRequestPointerLock || this.webkitRequestPointerLock, this.requestPointerLock(), me && me.isDead() && respawnTime < 0) {
        var e = new Comm.output(1);
        e.packInt8(Comm.requestRespawn), ws.send(e.buffer), respawnTime = 1e5
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

function addExplosionSprite(e, i, t, r, a, n, o, d, s) {
    var y = new BABYLON.Sprite("", e);
    y.animSpeed = i, y.position.x = t, y.position.y = r, y.position.z = a, y.baseSize = s, y.dx = n, y.dy = o, y.dz = d, y.df = 0, y.anim = 0, y.color.r = smokeColor.r, y.color.g = smokeColor.g, y.color.b = smokeColor.b, y.color.a = smokeColor.a
}

function addExplosion(e, i, t, r) {
    for (var a = 0; a < Math.floor(r / 2); a++) {
        var n = .04 * Math.random() + .02,
            o = 1 * Math.random() + .5,
            d = .5 * (.9 - o),
            s = (2 * Math.random() - 1) * d,
            y = (2 * Math.random() - 1) * d + .1,
            l = (2 * Math.random() - 1) * d;
        addExplosionSprite(explosionSmokeManager, n, e, i, t, s, y, l, o), addExplosionSprite(explosionFireManager, n, e, i, t, s, y, l, o)
    }
    if (me) {
        var h = Math.length3(me.x - e, me.y - i, me.z - t);
        h < 5 && (shake = Math.min(7, shake + Math.clamp(r - 25 * h, 0, 5)))
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
    if (scope = new Scope, hitIndicator = new HitIndicator, reticle = new Reticle, Meshes.muzzleFlash.material = Materials.muzzleFlash, Meshes.bullet.material = Materials.bullet, Meshes.egg.material = Materials.eggShell, Meshes.eggWhite.material = Materials.eggWhite, Meshes.eggYolk.material = Materials.eggYolk, Meshes.grenade.material = Materials.emissive, Meshes.ammo.material = Materials.standardInstanced, Meshes.grenadeItem.material = Materials.standardInstanced, munitionsManager = new MunitionsManager, itemManager = new ItemManager, buildMapMesh(), nameTexture = new BABYLON.DynamicTexture("", 2048, scene, !0, 2), nameSprites = new BABYLON.SpriteManager("", "", 24, {
            width: 512,
            height: 256
        }, scene), nameSprites.fogEnabled = !1, nameSprites.texture = nameTexture, bulletHoleManager = new BABYLON.SpriteManager("", "img/bulletHoles.png?v=1", 200, 32, scene), bulletHoleManager.fogEnabled = !0, bulletHoleManager.addHole = function (e, i, t, r) {
            var a = new BABYLON.Sprite("", this);
            a.position.x = i, a.position.y = t, a.position.z = r, a.angle = 6.282 * Math.random(), a.cellIndex = e, a.size = .03, 200 == this.sprites.length && this.sprites[0].dispose()
        }, explosionSmokeManager = new BABYLON.SpriteManager("", "img/explosion2.png?v=3", 500, 128, scene), explosionSmokeManager.fogEnabled = !0, explosionSmokeManager.noAlphaTest = !0, explosionFireManager = new BABYLON.SpriteManager("", "img/explosion2.png?v=3", 500, 128, scene), explosionFireManager.fogEnabled = !0, explosionFireManager.blendMode = BABYLON.Engine.ALPHA_ADD, playOffline) meId = 0, addPlayer({
        id: 0,
        name: "Test",
        charClass: 0,
        team: 0,
        shellColor: 0,
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
        hp: 100,
        weaponIdx: 0,
        controlKeys: 0
    }), startRendering();
    else {
        setUpSocket();
        var e = new Comm.output(1);
        e.packInt8(Comm.clientReady), ws.send(e.buffer), (e = new Comm.output(1)).packInt8(Comm.ping), pingStartTime = Date.now(), ws.send(e.buffer)
    }
}

function startRendering() {
    document.getElementById("mainMenu").style.display = "none", document.getElementById("overlay").style.display = "none", gameType == GameType.teams && (document.getElementById("switchTeamButton").style.visibility = "visible"), document.getElementById("homeButton").style.visibility = "visible", document.getElementById("friendsButton").style.visibility = "visible", document.getElementById("game").style.display = "block", document.getElementById("gameCanvasContainer").appendChild(canvas), resize(), canvas.addEventListener("click", onCanvasClick, !1), canvas.addEventListener("mousedown", onCanvasMouseDown, !1), canvas.addEventListener("mouseup", onCanvasMouseUp, !1), canvas.addEventListener("mousemove", onCanvasMouseMove), captureKeys(), closeAlertDialog(), scene.registerBeforeRender(function () {
        update(), me && (light.position.x = me.x, light.position.y = me.y + 2, light.position.z = me.z)
    }), engine.runRenderLoop(function () {
        scene.render()
    })
}

function setUpSocket() {
    ws.onmessage = function (e) {
        for (var i = new Comm.input(e.data); i.isMoreDataAvailable();) switch (i.unPackInt8U()) {
            case Comm.clientReady:
                startRendering();
                break;
            case Comm.addPlayer:
                var t = {
                    id: i.unPackInt8U(),
                    name: i.unPackString(),
                    charClass: i.unPackInt8U(),
                    team: i.unPackInt8U(),
                    shellColor: i.unPackInt8U(),
                    x: i.unPackFloat(),
                    y: i.unPackFloat(),
                    z: i.unPackFloat(),
                    dx: i.unPackFloat(),
                    dy: i.unPackFloat(),
                    dz: i.unPackFloat(),
                    viewYaw: i.unPackRadU(),
                    moveYaw: i.unPackRadU(),
                    pitch: i.unPackRad(),
                    totalKills: i.unPackInt16U(),
                    killStreak: i.unPackInt16U(),
                    bestKillStreak: i.unPackInt16U(),
                    hp: i.unPackInt8U(),
                    weaponIdx: i.unPackInt8U(),
                    controlKeys: i.unPackInt8U()
                };
                players[t.id] || (meId == t.id || (0 == t.name.length ? t.name = "Anonymous" : (t.name = fixStringWidth(t.name), isBadWord(t.name) && (t.name = "!@#$"))), addPlayer(t));
                break;
            case Comm.removePlayer:
                removePlayer(s = i.unPackInt8U());
                break;
            case Comm.spawnItem:
                var r = i.unPackInt16U(),
                    a = i.unPackInt8U(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    d = i.unPackFloat();
                itemManager.spawnItem(r, a, n, o, d);
                break;
            case Comm.collectItem:
                var s = i.unPackInt8U(),
                    a = i.unPackInt8U(),
                    y = i.unPackInt8U(),
                    r = i.unPackInt16U();
                itemManager.collectItem(a, r), s == meId && me.collectItem(a, y);
                break;
            case Comm.keyDown:
                var s = i.unPackInt8U(),
                    l = i.unPackInt8U();
                (C = players[s]) && (C.controlKeys |= l);
                break;
            case Comm.keyUp:
                var s = i.unPackInt8U(),
                    l = i.unPackInt8U();
                (C = players[s]) && (C.controlKeys ^= l);
                break;
            case Comm.jump:
                s = i.unPackInt8U();
                (C = players[s]) && players[s].jump();
                break;
            case Comm.die:
                var h, x = i.unPackInt8U(),
                    c = i.unPackInt8U(),
                    z = i.unPackInt8U(),
                    u = players[x],
                    m = players[c];
                m ? (h = m.name, m.isDead() || (m.totalKills++, m.killStreak++, m.bestKillStreak = Math.max(m.bestKillStreak, m.killStreak), c == meId && (kills++, bestKillStreak = Math.max(bestKillStreak, m.killStreak)))) : h = "N/A";
                var p;
                if (u) {
                    p = u.name;
                    var g = new BABYLON.Vector3(u.x, u.y + .32, u.z);
                    u.actor.deathSound.setPosition(g), u.actor.deathSound.play();
                    var f = Math.randomInt(0, Sounds.death.length);
                    Sounds.death[f].setPosition(g), Sounds.death[f].play(), u.actor.explodeMesh.setEnabled(!0), u.actor.whiteMesh.setEnabled(!0), u.actor.yolkMesh.setEnabled(!0), beginAnimation(u.actor.explodeMesh, 0, 50, !1, 1), scene.beginAnimation(u.actor.whiteMesh, 0, 50, !1, 1), scene.beginAnimation(u.actor.yolkMesh, 0, 56, !1, 1), shellFragBurst(u.actor.mesh, 200, 1), u.die(), u.resetStateBuffer(), u.actor.mesh.position.x = u.x, u.actor.mesh.position.y = u.y, u.actor.mesh.position.z = u.z
                } else p = "N/A";
                if (x != meId) {
                    if (c == meId) {
                        var w = document.getElementById("KILL_BOX");
                        w.style.display = "block", document.getElementById("KILLED_NAME").innerText = p;
                        var v = document.getElementById("KILL_STREAK");
                        me.killStreak > 1 ? v.innerText = me.killStreak + "-KILL STREAK" : v.innerText = "";
                        var M = 1.5,
                            b = setInterval(function () {
                                w.style.transform = "scale(" + M + "," + M + ")", (M -= .05) <= 1 && (M = 1, clearInterval(b))
                            }, 33);
                        clearTimeout(killDisplayTimeout), killDisplayTimeout = setTimeout(function () {
                            w.style.display = "none"
                        }, 4e3)
                    }
                } else {
                    deaths++, camera.parent = null, camera.position = new BABYLON.Vector3(me.actor.mesh.position.x, me.actor.mesh.position.y + .2, me.actor.mesh.position.z), m && (camera.lockedTarget = m.actor.bodyMesh), document.exitPointerLock(), keyIsDown = {}, respawnTime = z;
                    var k = document.getElementById("DEATH_BOX");
                    k.style.display = "block", document.getElementById("KILLED_BY_NAME").innerText = h;
                    var M = 2,
                        b = setInterval(function () {
                            k.style.transform = "scale(" + M + "," + M + ")", (M -= .05) <= 1 && (M = 1, clearInterval(b))
                        }, 33),
                        S = document.getElementById("RESPAWN");
                    S.innerText = "";
                    var B = setInterval(function () {
                        S.innerText = "You may respawn in " + respawnTime, --respawnTime < 0 && (clearInterval(B), S.innerText = "CLICK TO RESPAWN!")
                    }, 1e3)
                }
                m && u && addKillText(m, u), rebuildPlayerList(), updateBestStreakUi();
                break;
            case Comm.chat:
                var s = i.unPackInt8U(),
                    I = i.unPackString(),
                    C = players[s];
                chatParser.innerHTML = I, I = chatParser.textContent.trim(), C && I.length > 0 && !isBadWord(I) && addChat(I, C);
                break;
            case Comm.sync:
                var r = i.unPackInt8U(),
                    A = i.unPackInt8U(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    d = i.unPackFloat(),
                    E = i.unPackRadU(),
                    P = i.unPackRad(),
                    L = i.unPackInt8U();
                if (!(C = players[r])) break;
                if (r == meId) {
                    C.serverX = n, C.serverY = o, C.serverZ = d;
                    for (var T = A, O = 1e6, N = A; N != me.stateIdx;) {
                        var F = me.previousStates[N],
                            Y = Math.sqrt(Math.pow(n - F.x, 2) + Math.pow(o - F.y, 2) + Math.pow(d - F.z, 2));
                        Y < O && (T = N, O = Y), N = (N + 1) % stateBufferSize
                    }
                    var N = T,
                        D = C.previousStates[N],
                        R = C.x,
                        G = C.y,
                        U = C.z;
                    C.x = n, C.y = o, C.z = d, C.dx = D.dx, C.dy = D.dy, C.dz = D.dz, C.climbing = D.climbing, C.jumping = D.jumping;
                    for (var H = me.controlKeys; N != C.stateIdx; N = Math.mod(N + 1, stateBufferSize)) D = C.previousStates[N], C.controlKeys = D.controlKeys, C.moveYaw = D.moveYaw, D.jump && C.jump(), C.update(D.delta, !0), C.previousStates[N].x = C.x, C.previousStates[N].y = C.y, C.previousStates[N].z = C.z, C.previousStates[N].dx = C.dx, C.previousStates[N].dy = C.dy, C.previousStates[N].dz = C.dz;
                    var W = Math.length3(C.x - R, C.y - G, C.z - U);
                    if (W < .01) C.x = R, C.y = G, C.z = U;
                    else if (W < .5) {
                        var K = Math.length2(C.dx, C.dz),
                            j = Math.max(4 - 64 * K, 1);
                        C.x = R + (C.x - R) / j, C.z = U + (C.z - U) / j
                    }
                    C.controlKeys = H
                } else C.x = n, C.y = o, C.z = d, C.viewYaw = E, C.moveYaw = E, C.pitch = P, C.climbing = L;
                break;
            case Comm.fireBullet:
                var r = i.unPackInt8U(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    d = i.unPackFloat(),
                    V = i.unPackFloat(),
                    q = i.unPackFloat(),
                    _ = i.unPackFloat();
                if (!(C = players[r])) break;
                r != meId && (C.actor.head.rotation.x = C.pitch, C.actor.mesh.rotation.y = C.viewYaw, C.weapon.actor.fire()), munitionsManager.fireBullet(C, {
                    x: n,
                    y: o,
                    z: d
                }, {
                    x: V,
                    y: q,
                    z: _
                }, C.weapon.damage, C.weapon.ttl, C.weapon.velocity);
                break;
            case Comm.fireShot:
                var r = i.unPackInt8U(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    d = i.unPackFloat(),
                    V = i.unPackFloat(),
                    q = i.unPackFloat(),
                    _ = i.unPackFloat(),
                    Q = i.unPackInt8U();
                if (!(C = players[r])) break;
                r != meId && (C.actor.head.rotation.x = C.pitch, C.actor.mesh.rotation.y = C.viewYaw, C.weapon.actor.fire()), Math.seed = Q;
                for (N = 0; N < 20; N++) {
                    var Z = Math.normalize3({
                        x: V + Math.seededRandom(-.15, .15),
                        y: q + Math.seededRandom(-.1, .1),
                        z: _ + Math.seededRandom(-.15, .15)
                    });
                    munitionsManager.fireBullet(C, {
                        x: n,
                        y: o,
                        z: d
                    }, Z, C.weapon.damage, C.weapon.ttl, C.weapon.velocity * Math.seededRandom(.9, 1.1))
                }
                break;
            case Comm.throwGrenade:
                var r = i.unPackInt8U(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    d = i.unPackFloat(),
                    X = i.unPackFloat(),
                    J = i.unPackFloat(),
                    $ = i.unPackFloat();
                if (!(C = players[r])) break;
                C.grenadeCount--, r != meId ? (C.actor.head.rotation.x = C.pitch, C.actor.mesh.rotation.y = C.viewYaw) : updateAmmoUi(), C.actor.throwGrenade(), munitionsManager.throwGrenade(C, {
                    x: n,
                    y: o,
                    z: d
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
                if (!(C = players[r])) break;
                C.hp = ie, C.actor.hit(), ie > 0 && shellFragBurst(C.actor.mesh, 100, 1);
                break;
            case Comm.respawn:
                var r = i.unPackInt8U(),
                    n = i.unPackFloat(),
                    o = i.unPackFloat(),
                    d = i.unPackFloat(),
                    te = i.unPackInt8U();
                (C = players[r]) && (C.respawn(n, o, d, te), r == meId && (document.getElementById("DEATH_BOX").style.display = "none", camera.position = BABYLON.Vector3.Zero(), camera.rotation = BABYLON.Vector3.Zero(), camera.rotationQuaternion = BABYLON.Quaternion.Zero(), camera.parent = me.actor.eye, camera.lockedTarget = null));
                break;
            case Comm.switchTeam:
                var r = i.unPackInt8U(),
                    re = i.unPackInt8U();
                if (gameType != GameType.teams) break;
                if (C = players[r]) {
                    C.team = re, C.killStreak = 0, r == meId && (myTeam = re);
                    for (N = 0; N < 20; N++)(C = players[N]) && C.actor && C.actor.updateTeam();
                    rebuildPlayerList()
                }
                break;
            case Comm.ping:
                var ae = Date.now() - pingStartTime;
                pingTotal += ae, pingSamples++;
                var ne = document.getElementById("PING");
                ne.style.color = ae < 100 ? "#0f0" : ae < 150 ? "#ff0" : ae < 200 ? "#f90" : "#f00", document.getElementById("PING").innerText = ae + "ms", setTimeout(function () {
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
        var r = new BABYLON.ParticleSystem("particles", i, scene);
        r.targetStopDuration = .2, r.disposeOnStop = !0, r.particleTexture = new BABYLON.Texture("./img/shellfrag.png", scene), r.emitter = e, r.minEmitBox = new BABYLON.Vector3(-.2, .2, -.2), r.maxEmitBox = new BABYLON.Vector3(.2, .4, .2), r.color1 = new BABYLON.Color4(1, 1, 1, 4), r.color2 = new BABYLON.Color4(1, 1, 1, 4), r.colorDead = new BABYLON.Color4(1, 1, 1, 0), r.minSize = .01, r.maxSize = .04, r.minLifeTime = .1, r.maxLifeTime = .3, r.emitRate = i, r.manualEmitCount = i, r.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD, r.gravity = new BABYLON.Vector3(0, -10, 0), r.direction1 = new BABYLON.Vector3(-2, -1, -2), r.direction2 = new BABYLON.Vector3(2, 3, 2), r.minAngularSpeed = 10 * -Math.PI, r.maxAngularSpeed = 10 * Math.PI, r.minEmitPower = 1 * t, r.maxEmitPower = 2 * t, r.updateSpeed = .01, r.start()
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
    }(SPS = new BABYLON.SolidParticleSystem("SPS", scene, {
        updatable: !1
    })).computeParticleColor = !1, SPS.computeParticleTexture = !1, SPS.computeParticleRotation = !1, Object.keys(e.data).forEach(function (i) {
        var t = e.data[i];
        Object.keys(t).forEach(function (e) {
            if (i > 0) {
                var r = t[e],
                    a = 0;
                try {
                    SPS.addShape(Meshes.map[i][e], r.length, {
                        positionFunction: function (t, n, o) {
                            t.position.x = r[a].x + .5, t.position.y = r[a].y, t.position.z = r[a].z + .5, t.rotation.x = .5 * -Math.PI, t.rotation.y = r[a].dir * rotInc, t.alive = !1, map.data[r[a].x][r[a].y][r[a].z] = {
                                cat: i,
                                dec: e,
                                dir: r[a].dir
                            }, a++
                        }
                    })
                } catch (e) {}
            }
        })
    });
    var a = [{
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
    SPS.addShape(Meshes.mountains, 3, {
        positionFunction: function (e, i, t) {
            e.position.x = map.width / 2, e.position.y = 0, e.position.z = map.depth / 2, e.scaling.x = a[t].w, e.scaling.y = a[t].h, e.scaling.z = a[t].w, e.rotation.y = a[t].r, e.alive = !1
        }
    }), (mapMesh = SPS.buildMesh()).receiveShadows = !0, mapMesh.material = Materials.map, mapMesh.freezeWorldMatrix()
}

function buildMapMesh() {
    createMapCells();
    var e = new BABYLON.StandardMaterial("water material", scene);
    e.diffuseColor = new BABYLON.Color3(.05, .1, .2), e.specularColor = new BABYLON.Color3(0, 0, 0);
    var i = BABYLON.MeshBuilder.CreatePlane("plane", {
        size: 1e3
    }, scene);
    i.rotation.x = Math.PI / 2, i.position.y = -1, i.material = e;
    var t = new BABYLON.SkyMaterial("skyMaterial", scene);
    t.backFaceCulling = !1;
    var r = BABYLON.Mesh.CreateBox("skyBox", 1e3, scene);
    r.material = t, r.position.x = map.width / 2, r.position.z = map.depth / 2, t.fogEnabled = !1, t.useSunPosition = !0, t.sunPosition = new BABYLON.Vector3(-.25, 1, -.5), t.turbidity = 1.5, t.luminance = .5, t.rayleigh = 2
}

function update() {
    var e = Math.floor(60 / SyncRate);
    fps[fpsIdx] = engine.getFps(), fpsSum += fps[fpsIdx], fpsSum -= fps[(fpsIdx + 1) % 60], fpsIdx = (fpsIdx + 1) % 60;
    var i = Math.ceil(fpsSum / 60);
    fpsTotal += i, ++fpsSamples % 10 == 0 && (document.getElementById("FPS").innerHTML = "FPS: " + i, document.getElementById("healthBar").style.width = me.hp + "%");
    var t = Date.now();
    if (pingSamples > 10) {
        var r = t - pingStartTime;
        highestPing = Math.max(highestPing, r)
    }
    for (var a = (n = t - lastTimeStamp) / (n / (1e3 / 60)); lastTimeStamp < t - .01;) {
        lastTimeStamp += a;
        var n = a / (1e3 / 60);
        if (freezeFrame) me.update(n), me.actor.update(n);
        else
            for (var o = 0; o < players.length; o++) {
                var d = players[o];
                d && (d.update(n), d.actor && d.actor.update(n))
            }
        me && (me.previousStates[me.stateIdx] = {
            delta: n,
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
        }, me.stateIdx % e == 0 && ws.readyState == ws.OPEN && me.hp > 0 && !freezeFrame && serverSync(), me.stateIdx = Math.mod(me.stateIdx + 1, stateBufferSize), me.previousStates[me.stateIdx].jump = !1, hitIndicator.update(n), reticle.update(n), me.weapon && 0 == me.weapon.ammo.rounds && (me.stateIdx % 20 == 0 ? document.getElementById("AMMO").style.color = "#f00" : me.stateIdx % 20 == 10 && (document.getElementById("AMMO").style.color = "#fff")), 1 == grenadePowerUp && (grenadeThrowPower = Math.min(grenadeThrowPower + .015, 1)) > 0 && (document.getElementById("grenadeThrowContainer").style.visibility = "visible", document.getElementById("grenadeThrow").style.height = 100 * grenadeThrowPower + "%")), freezeFrame || (munitionsManager.update(n), itemManager.update(n), updateExplosions(explosionSmokeManager, n), updateExplosions(explosionFireManager, n))
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
    i.id == meId ? ((me = i).ws = ws, camera.parent = me.actor.eye, updateAmmoUi()) : i.isDead() && i.actor.die(), players[e.id] = i, rebuildPlayerList()
}

function removePlayer(e) {
    var i = players[e];
    e != meId ? i && (i.actor.remove(), delete players[e], rebuildPlayerList()) : console.log("Tried to remove ME")
}

function rebuildPlayerList() {
    for (var e = [], i = 0; i < players.length; i++) players[i] && e.push(i);
    if (gameType == GameType.teams) {
        for (var t = [0, 0, 0], i = 0; i < 20; i++)(a = players[i]) && (t[a.team] += a.killStreak);
        t[1] > t[2] ? lastLeadingTeam = 1 : t[2] > t[1] && (lastLeadingTeam = 2), t[lastLeadingTeam] += 1e5, e.sort(function (e, i) {
            return players[i].killStreak + t[players[i].team] - (players[e].killStreak + t[players[e].team])
        })
    } else e.sort(function (e, i) {
        return players[i].killStreak - players[e].killStreak
    });
    var r = document.getElementById("playerList").children;
    for (i = 0; i < e.length; i++) {
        var a = players[e[i]];
        r[i].style.display = "block", r[i].children[0].innerText = a.name, r[i].children[1].innerText = a.killStreak, players[e[i]].id == meId ? (r[i].className = "thisPlayer", r[i].style.background = teamColors.meBackground[a.team]) : (r[i].className = "otherPlayer", r[i].style.background = teamColors.themBackground[a.team], r[i].style.color = teamColors.text[a.team])
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
        e.innerHTML = me.weapon.name, (e = document.getElementById("AMMO")).style.color = "#fff", e.innerHTML = me.weapon.ammo.rounds + "/" + Math.min(me.weapon.ammo.store, me.weapon.ammo.storeMax);
        for (var i = 1; i <= 3; i++) me.grenadeCount >= i ? document.getElementById("grenade" + i).src = "img/grenadeIcon.png" : document.getElementById("grenade" + i).src = "img/grenadeIconDark.png"
    }
}

function captureKeys() {
    document.onkeydown = onKeyDown, document.onkeyup = onKeyUp
}

function releaseKeys() {
    document.onkeydown = null, document.onkeyup = null
}

function inputDown(e) {
    if (!me.isDead()) {
        var i = inputToControlMap[e];
        switch (i) {
            case "up":
            case "down":
            case "left":
            case "right":
                var t = controlToBitmask[i];
                (r = new Comm.output(2)).packInt8(Comm.keyDown), r.packInt8(t), ws.send(r.buffer), me.controlKeys |= t, me.previousStates[me.stateIdx].controlKeys |= t;
                break;
            case "jump":
                var r = new Comm.output(1);
                r.packInt8(Comm.jump), ws.send(r.buffer), me.jump(), me.previousStates[me.stateIdx].jump = !0, me.previousStates[me.stateIdx].jumping = me.jumping, me.previousStates[me.stateIdx].dy = me.dy;
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
}

function inputUp(e) {
    if (!me.isDead()) {
        var i = inputToControlMap[e];
        switch (i) {
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
                var t = controlToBitmask[i],
                    r = new Comm.output(2);
                r.packInt8(Comm.keyUp), r.packInt8(t), ws.send(r.buffer), me.controlKeys ^= t, me.previousStates[me.stateIdx].controlKeys |= t
        }
    }
}

function debugDump() {
    if (debugWindow) {
        for (var e = 0; e < 20; e++) {
            var i = players[e];
            if (i) {
                var t = "",
                    r = {};
                for (var a in i) r[a] = i[a];
                var n = {
                    x: r.actor.mesh.position.x,
                    y: r.actor.mesh.position.y,
                    z: r.actor.mesh.position.z
                };
                delete r.weapon, delete r.weapons, delete r.actor, delete r.previousStates, delete r.ws, t += "\n\nPlayer: " + objToStr(r), t += "\n\nActor: " + objToStr(n);
                for (var a in i.weapons) {
                    var o = {};
                    for (var d in i.weapons[a]) o[d] = i.weapons[a][d];
                    delete o.player, delete o.actor, t += "\n\nWeapon: " + objToStr(o)
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
    canvas.focus(), chatInEl.style.display = "block", chatInEl.value = "Press ENTER to chat", chatInEl.style.background = "transparent", chatInEl.blur()
}

function addChat(e, i) {
    i && (e = '<span style="color: ' + teamColors.text[i.team] + '">' + i.name + ": </span>" + e), (chatOutEl.innerHTML.match(/<br>/g) || []).length > 4 && (chatOutEl.innerHTML = chatOutEl.innerHTML.substr(chatOutEl.innerHTML.search("<br>") + 4)), chatOutEl.innerHTML += e + "<br>"
}

function onChatKeyDown(e) {
    var i = (e = e || window.event).key;
    switch (chatInEl.value = fixStringWidth(chatInEl.value, 280), i) {
        case "Enter":
            var t = chatInEl.value.trim();
            if ("" != t) {
                var r = new Comm.output(2 + 2 * t.length);
                r.packInt8(Comm.chat), r.packString(t), ws.send(r.buffer), addChat(t, me), me.chatLineCap--
            }
            case "Tab":
                initChatIn(), e.preventDefault(), e.stopPropagation(), captureKeys()
    }
}

function onKeyDown(e) {
    var i = (e = e || window.event).key;
    if (!keyIsDown[e.keyCode])
        if (keyIsDown[e.keyCode] = !0, grenadePowerUp || 0 != me.controlKeys || "Enter" != i || !settings.enableChat) {
            var t = ("" + i).toLocaleUpperCase();
            if ("" != inputTally && "" == (inputTally = inputTally.replace(t, "")) && (document.getElementById("help").style.display = "none", localStorage.setItem("hideHelp", 1)), " " == t && (t = "SPACE", e.preventDefault()), debug) {
                if ("`" == t) return void debugDump();
                if ("\\" == t) {
                    freezeFrame = !0;
                    for (r = 0; r < scene.particleSystems.length; r++) scene.particlesPaused = !0;
                    for (var r = 0; r < 20; r++) players[r] && players[r].actor && (players[r].actor.mesh.setVisible(!0), players[r].actor.showNameSprite());
                    ws.close()
                }
            }
            inputDown(t)
        } else me.chatLineCap > 0 && (releaseKeys(), chatInEl.style.background = "rgba(0, 0, 0, 0.5)", chatInEl.value = "", chatInEl.focus(), keyIsDown[13] = !1)
}

function onKeyUp(e) {
    var i = (e = e || window.event).key;
    if (keyIsDown[e.keyCode]) {
        keyIsDown[e.keyCode] = !1;
        var t = ("" + i).toLocaleUpperCase();
        " " == t && (t = "SPACE", e.preventDefault()), inputUp(t)
    }
}

function Scope() {
    this.scopeSprite = new BABYLON.SpriteManager("", "img/scope.png?v=1", 1, 256, scene), this.scopeSprite.fogEnabled = !1, this.scopeSprite.layerMask = 536870912, this.crosshairs = new BABYLON.AbstractMesh("", scene), this.crosshairs.setEnabled(!1), this.crosshairs.position.z = 2;
    var e = [new BABYLON.Vector3(-1, 0, 0), new BABYLON.Vector3(1, 0, 0)],
        i = BABYLON.MeshBuilder.CreateLines("", {
            points: e
        }, scene);
    i.layerMask = 536870912, i.color = BABYLON.Color3.Black(), i.parent = this.crosshairs, e = [new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(0, 1, 0)], (i = BABYLON.MeshBuilder.CreateLines("", {
        points: e
    }, scene)).layerMask = 536870912, i.color = BABYLON.Color3.Black(), i.parent = this.crosshairs
}

function HitIndicator() {
    this.mesh = new BABYLON.Mesh("hitIndicator", scene), this.mesh.updatable = !0, this.mesh.hasVertexAlpha = !0, this.positions = [0, 0, 0, 0, .5, 0, .5, .5, 0, .5, 0, 0, .5, -.5, 0, 0, -.5, 0, -.5, -.5, 0, -.5, 0, 0, -.5, .5, 0];
    var e = [0, 1, 8, 0, 2, 1, 0, 2, 1, 0, 3, 2, 0, 3, 2, 0, 4, 3, 0, 4, 3, 0, 5, 4, 0, 5, 4, 0, 6, 5, 0, 6, 5, 0, 7, 6, 0, 7, 6, 0, 8, 7, 0, 8, 7, 0, 1, 8];
    this.colors = new Array(48).fill(0);
    for (var i = 0; i < 48; i += 4) this.colors[i] = 1, this.colors[i + 1] = .9, this.colors[i + 2] = 0, this.colors[i + 3] = -.5;
    var t = new BABYLON.VertexData;
    t.positions = this.positions, t.indices = e, t.colors = this.colors, t.applyToMesh(this.mesh, !0), this.mesh.layerMask = 536870912, this.mesh.material = Materials.ui, this.resize()
}

function Reticle() {
    this.mesh = new BABYLON.AbstractMesh("reticle", scene), this.mesh.position.z = 1, this.lines = [], Meshes.reticle.setMaterial(Materials.ui);
    for (var e = 0; e < 4; e++) {
        var i = Meshes.reticle.createInstance("reticleLine", this.mesh);
        i.parent = this.mesh, i.scaling = new BABYLON.Vector3(1, 1, 1), i.rotation.z = e * Math.PI / 2, this.lines.push(i)
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
    for (var t = i || e.getBoundingInfo().boundingBox.center.z, r = e.position.x - camera.globalPosition.x, a = e.position.y + t - camera.globalPosition.y, n = e.position.z - camera.globalPosition.z, o = Math.length3(r, a, n), d = Math.normalize3({
            x: r,
            y: a,
            z: n
        }, .9), s = camera.globalPosition.x, y = camera.globalPosition.y, l = camera.globalPosition.z, h = 0, x = 0; x < o - .9; x += .9) {
        var c = collidesWithCell(s += d.x, y += d.y, l += d.z);
        if (c && (c.cel.cat == MAP.ground || c.cel.cat == MAP.block) && 2 == ++h) return !1
    }
    return !0
}

function GrenadeActor(e) {
    this.grenade = e, this.mesh = Meshes.grenade.clone(""), this.mesh.setEnabled(!1), this.explodeSound = Sounds.grenade.explode.clone(), this.pinSound = Sounds.grenade.pin.clone(), this.beepSound = Sounds.grenade.beep.clone(), this.mesh.attachSound(this.pinSound), this.mesh.attachSound(this.beepSound), this.beep = !1, this.flashColor = null
}

function Eggk47Actor(e) {
    this.gun = e, this.playerActor = e.player.actor, this.scopeFov = .9, this.scopeY = .036, this.gunMesh = Meshes.eggk47.clone("eggk47", this.playerActor.gunContainer), this.gunMesh.setEnabled(!1), this.clipMesh = Meshes.eggk47Mag.clone("eggk47Mag", this.playerActor.gunContainer), this.clipMesh.setEnabled(!1), this.muzzleFlash = Meshes.muzzleFlash.clone("muzzleFlash", this.playerActor.gunContainer), this.muzzleFlash.setEnabled(!1), this.muzzleFlash.parent = this.playerActor.gunContainer, this.muzzleFlash.position.x = .25, this.muzzleFlash.position.z = .6, this.gun.player.id == meId && (this.gunMesh.setRenderingGroupId(1), this.clipMesh.setRenderingGroupId(1), this.muzzleFlash.setRenderingGroupId(1)), this.fireSound = Sounds.eggk47.fire.clone(), this.gunMesh.attachSound(this.fireSound), this.dryFireSound = Sounds.eggk47.dryFire.clone(), this.gunMesh.attachSound(this.dryFireSound), this.addSoundEvent(24, Sounds.eggk47.removeMag.clone()), this.addSoundEvent(72, Sounds.eggk47.insertMag.clone()), this.addSoundEvent(90, Sounds.eggk47.cycle.clone())
}

function DozenGaugeActor(e) {
    this.gun = e, this.playerActor = e.player.actor, this.scopeFov = 1, this.scopeY = .072, this.gripHandTarget = this.playerActor.gripHand.getChildMeshByName("gripHand.doubleShotgunGrip"), this.gunMesh = Meshes.doubleShotgun.clone("doubleShotgun", this.playerActor.gripHand), this.gunMesh.attachToParent(this.gripHandTarget), this.gunMesh.setEnabled(!1), this.barrel = this.gunMesh.getChildMeshByName("doubleShotgun.doubleShotgun.barrel"), this.muzzleFlash = Meshes.muzzleFlash.clone("muzzleFlash", this.playerActor.gunContainer), this.muzzleFlash.setEnabled(!1), this.muzzleFlash.parent = this.playerActor.gunContainer, this.muzzleFlash.position.x = .25, this.muzzleFlash.position.z = .6, this.gun.player.id == meId && (this.gunMesh.setRenderingGroupId(1), this.muzzleFlash.setRenderingGroupId(1)), this.fireSound = Sounds.dozenGauge.fire.clone(), this.gunMesh.attachSound(this.fireSound), this.dryFireSound = Sounds.eggk47.dryFire.clone(), this.gunMesh.attachSound(this.dryFireSound), this.addSoundEvent(321, Sounds.dozenGauge.open.clone()), this.addSoundEvent(377, Sounds.dozenGauge.load.clone()), this.addSoundEvent(397, Sounds.dozenGauge.close.clone())
}

function CSG1Actor(e) {
    this.gun = e, this.playerActor = e.player.actor, this.scopeFov = .5, this.scopeY = .0345, this.gunMesh = Meshes.csg1.clone("csg1", this.playerActor.gunContainer), this.gunMesh.setEnabled(!1), this.clipMesh = Meshes.csg1Mag.clone("csg1Mag", this.playerActor.gunContainer), this.clipMesh.setEnabled(!1), this.muzzleFlash = Meshes.muzzleFlash.clone("muzzleFlash", this.playerActor.gunContainer), this.muzzleFlash.setEnabled(!1), this.muzzleFlash.parent = this.playerActor.gunContainer, this.muzzleFlash.position.x = .25, this.muzzleFlash.position.z = .6, this.gun.player.id == meId && (this.gunMesh.setRenderingGroupId(1), this.clipMesh.setRenderingGroupId(1), this.muzzleFlash.setRenderingGroupId(1)), this.fireSound = Sounds.csg1.fire.clone(), this.gunMesh.attachSound(this.fireSound), this.dryFireSound = Sounds.eggk47.dryFire.clone(), this.gunMesh.attachSound(this.dryFireSound), this.addSoundEvent(881, Sounds.eggk47.removeMag.clone()), this.addSoundEvent(947, Sounds.eggk47.insertMag.clone()), this.addSoundEvent(1030, Sounds.csg1.pullAction.clone()), this.addSoundEvent(1100, Sounds.csg1.releaseAction.clone())
}

function Cluck9mmActor(e) {
    this.gun = e, this.playerActor = e.player.actor, this.scopeFov = 1.1, this.scopeY = .072, this.gunMesh = Meshes.cluck9mm.clone("cluck9mm", this.playerActor.gunContainer), this.gunMesh.setEnabled(!1), this.clipMesh = this.gunMesh.getChildMeshByName("cluck9mm.cluck9mmMag"), this.muzzleFlash = Meshes.muzzleFlash.clone("muzzleFlash", this.playerActor.gunContainer), this.muzzleFlash.setEnabled(!1), this.muzzleFlash.parent = this.playerActor.gunContainer, this.muzzleFlash.position.x = .25, this.muzzleFlash.position.z = .6, this.gun.player.id == meId && (this.gunMesh.setRenderingGroupId(1), this.clipMesh.setRenderingGroupId(1), this.muzzleFlash.setRenderingGroupId(1)), this.fireSound = Sounds.cluck9mm.fire.clone(), this.gunMesh.attachSound(this.fireSound), this.dryFireSound = Sounds.eggk47.dryFire.clone(), this.gunMesh.attachSound(this.dryFireSound), this.addSoundEvent(628, Sounds.cluck9mm.removeMag.clone()), this.addSoundEvent(675, Sounds.cluck9mm.insertMag.clone())
}

function ItemActor(e) {
    this.kind = e
}

function AmmoActor() {
    ItemActor.call(this, ItemManager.AMMO), this.mesh = Meshes.ammo.createInstance(""), this.mesh.setEnabled(!1), shadowGen && shadowGen.getShadowMap().renderList.push(this.mesh)
}

function GrenadeItemActor() {
    ItemActor.call(this, ItemManager.GRENADE), this.mesh = Meshes.grenadeItem.createInstance(""), this.mesh.setEnabled(!1), shadowGen && shadowGen.getShadowMap().renderList.push(this.mesh)
}

function ItemManager() {
    this.pools = [new Pool(function () {
        return new ItemManager.Constructors[ItemManager.AMMO]
    }, 100), new Pool(function () {
        return new ItemManager.Constructors[ItemManager.GRENADE]
    }, 20)]
}

function getKeyByValue(e, i) {
    for (var t in e)
        if (e.hasOwnProperty(t) && e[t] === i) return t
}

function selectServer(e) {
    selectedServer = e, localStorage.setItem("selectedServer", selectedServer)
}

function selectGameType(e) {
    gameType = e, localStorage.setItem("gameType", e), setupGameTypeButtons()
}

function setupGameTypeButtons() {
    for (var e = document.getElementsByName("gameType"), i = 0; i < e.length; i++) i == gameType ? (e[i].className = "red", e[i].style.zoom = 1) : (e[i].className = "brown", e[i].style.zoom = .9)
}

function resize() {
    canvas && (inGame ? (canvas.style.width = "100%", canvas.style.height = "100%", canvas.className = "") : (canvas.style.width = "100%", canvas.height = .66 * canvas.width, canvas.className = "roundedBorder")), engine && engine.resize(), hitIndicator && hitIndicator.resize(), reticle && reticle.resize()
}

function onResourcesLoaded() {
    function e() {
        document.getElementById("className").innerText = classes[selectedClass].name, document.getElementById("classWeapon").innerText = "Weapon: " + d[selectedClass].weapon.name;
        for (x in l) {
            var e = (d[selectedClass].weapon[x] + l[x].min) / (l[x].max - Math.abs(l[x].min));
            e = Math.floor(95 * e) + 5, document.getElementById(l[x].name).style.width = e + "%"
        }
    }
    var i = getStoredString("lastVersionPlayed", version);
    if (i != version) {
        var t = i.split("."),
            r = version.split(".");
        t[0] == r[0] && t[1] == r[1] || showChangelog()
    }
    localStorage.setItem("lastVersionPlayed", version), document.getElementById("username").disabled = !1;
    var a = classes.length;
    meId = 0;
    var n = new BABYLON.StandardMaterial("groundMat", scene);
    n.diffuseColor = new BABYLON.Color3(.4, .3, .2);
    var o = BABYLON.Mesh.CreatePlane("ground", 100, scene);
    o.position.y = -.32, o.rotation.x = Math.PI / 2, o.receiveShadows = !0, o.material = n, light.position.y = 2, selectedColor = getStoredNumber("selectedColor", 0), selectedClass = getStoredNumber("selectedClass", Math.randomInt(0, classes.length));
    for (var d = [], s = 0; s < a; s++) {
        var y = new function (e, i, t, r) {
            this.id = 1, this.name = "", this.x = e, this.y = i, this.z = t, this.hp = 100, this.shellColor = selectedColor, this.actor = new PlayerActor(this), this.actor.mesh.setPivotPoint(new BABYLON.Vector3(0, 0, -1.6), BABYLON.Space.GLOBAL), this.actor.head.rotation.y = 2.5, this.weapon = new classes[r].weapon(this), this.weapon.actor.equip()
        }(0, -.32, 1.6, s);
        y.actor.mesh.rotation.y = s * Math.PI / (a / 2), d.push(y)
    }
    for (var l = {
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
        }, s = 0; s < a; s++) {
        var h = d[s].weapon;
        for (var x in l) l[x].flip ? (l[x].max = Math.max(l[x].max, -h[x]), l[x].min = Math.min(l[x].min, -h[x])) : (l[x].max = Math.max(l[x].max, h[x]), l[x].min = 0)
    }
    var c = -selectedClass;
    window.selectClass = function (i) {
        selectedClass = Math.mod(selectedClass + i, a), localStorage.setItem("selectedClass", selectedClass), c -= i, e()
    }, window.selectColor = function (e) {
        selectedColor = e.id.substr(5), d[selectedClass].actor.setShellColor(selectedColor), localStorage.setItem("selectedColor", selectedColor)
    }, e(), BABYLON.Engine.audioEngine.setGlobalVolume(settings.volume), engine.runRenderLoop(function () {
        scene.render();
        var e = c / 5;
        c -= e;
        for (var i = 0; i < a; i++) d[i].actor.mesh.rotation.y += e * (Math.PI / (a / 2))
    });
    var z = new Date("February 27, 2018 00:00:00");
    Date.now() > z.getTime() && "true" !== document.cookie.replace(/(?:(?:^|.*;\s*)hideSpaceTyrantAd\s*\=\s*([^;]*).*$)|^.*$/, "$1") && (showBigAd(), document.cookie = "hideSpaceTyrantAd=true; max-age=43200;")
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
        i = document.getElementById("bugDescription"),
        t = "Version: " + version;
    if (t += "\nFacebook ID: " + facebookId, t += "\nPointer lock: " + (document.pointerLockElement ? "true" : "false"), t += "\n\nGame session: " + gameSession + "\nPing: " + Math.floor(pingTotal / pingSamples) + "\nFPS: " + Math.ceil(fpsSum / 60) + "\nGame type: " + gameType + "\nPrivate game: " + privateGame + "\nKills: " + kills + "\nDeaths: " + deaths + "\nBest kill streak: " + bestKillStreak + "\nRespawn time: " + respawnTime + "\nHighest ping: " + highestPing, me) {
        var r = {};
        for (var a in me) r[a] = me[a];
        delete r.weapon, delete r.weapons, delete r.actor, delete r.previousStates, delete r.ws, t += "\n\nPlayer: " + objToStr(r), stateLog && (t += "\n\n" + objToStr(stateLog), stateLog = null);
        for (var a in me.weapons) {
            var n = {};
            for (var o in me.weapons[a]) n[o] = me.weapons[a][o];
            delete n.player, delete n.actor, t += "\n\nWeapon: " + objToStr(n)
        }
    }
    t += "\n\nPage: " + window.location.pathname + "\nReferrer: " + document.referrer + "\nBrowser: " + navigator.appName + "\nEngine: " + navigator.product + "\nVersion: " + navigator.appVersion + "\nUser agent: " + navigator.userAgent + "\nLanguage: " + navigator.language + "\nPlatform: " + navigator.platform + "\n\nLocal storage: " + objToStr(localStorage) + "\n\nScreen size: " + screen.width + " x " + screen.height + "\nDocument size: " + document.width + " x " + document.height + "\nInner size: " + innerWidth + " x " + innerHeight + "\nAvailable size: " + screen.availWidth + " x " + screen.availHeight + "\nColor depth: " + screen.colorDepth + "\nPixel depth: " + screen.pixelDepth + "\n\nWebGL: " + objToStr(engine.getGlInfo()) + "\n\nEngine caps: " + objToStr(engine.getCaps());
    var d = {
            name: "Bug Report",
            email: e.value || "not@provided.com",
            comments: i.value + "\n\n" + lastErrorMessage + "\n\n" + t
        },
        s = [];
    for (var y in d) s.push(encodeURIComponent(y) + "=" + encodeURIComponent(d[y]));
    var l = s.join("&").replace(/%20/g, "+"),
        h = new XMLHttpRequest;
    h.onreadystatechange = function () {
        h.readyState == XMLHttpRequest.DONE && 200 == h.status && setTimeout(function () {
            notify("Your bug report has been received.<br>Thank you!")
        }, 1e3)
    }, closeBugReport(), e.value = "", i.value = "", h.open("POST", location.protocol + "//" + location.hostname + "/feedback.php", !0), h.setRequestHeader("Content-type", "application/x-www-form-urlencoded"), h.send(l)
}

function openJoinBox() {
    document.getElementById("customGame").style.display = "none", document.getElementById("joinGame").style.display = "block"
}

function closeJoinBox() {
    document.getElementById("customGame").style.display = "block", document.getElementById("joinGame").style.display = "none", document.getElementById("joinCode").value = "", history.replaceState(null, null, location.pathname)
}

function login(e) {
    if (0 != (username = document.getElementById("username").value.trim()).length) {
        privateGame = e;
        var i, t = selectedServer,
            r = Comm.joinPublicGame,
            a = "ws://";
        "https:" === location.protocol && (a = "wss://");
        var a = "wss://",
            n = document.getElementById("joinCode").value.trim();
        if (e) r = Comm.createPrivateGame, i = a + servers[t].address;
        else if ("" != n) {
            r = Comm.joinPrivateGame, n.startsWith("#") && (n = n.substr(1)), t = Number.parseInt(n.substr(0, 1), 36), uniqueId = Number.parseInt(n.substr(1, 3), 36), uniqueKey = Number.parseInt(n.substr(4, 2), 36);
            try {
                i = a + servers[t].address
            } catch (e) {
                return openAlertDialog("GAME NOT FOUND", "Sorry! This game ID is either<br>invalid, or no longer exists.", {
                    label: "OK"
                }), uniqueId = 0, uniqueKey = 0, void(document.getElementById("joinCode").value = "")
            }
            selectedServer = t
        } else i = a + servers[t].address;
        document.getElementById("alert").focus(), openAlertDialog("CONNECTING", "Please wait!", null, null, !0), (ws = new WebSocket(i)).binaryType = "arraybuffer", ws.onopen = function (e) {
            localStorage.setItem("lastUsername", username), ga("send", "event", "play game", "class", classes[selectedClass].name), fbq("trackCustom", "PlayGame", {
                charClass: classes[selectedClass].name,
                server: servers[selectedServer].name
            });
            var i = 10 + 2 * username.length;
            facebookId && (i += 2 * facebookId.length + 5);
            var t = new Comm.output(i);
            t.packInt8(Comm.login), t.packInt8(r), t.packInt8(gameType), t.packInt16(uniqueId), t.packInt16(uniqueKey), t.packInt8(selectedClass), t.packInt8(selectedColor), t.packString(username), facebookId && (t.packInt32(gameSession), t.packString(facebookId)), ws.send(t.buffer)
        }, ws.onclose = function (e) {
            freezeFrame || (e.code == CloseCode.gameNotFound ? (openAlertDialog("GAME NOT FOUND", "Sorry! This game ID is either<br>invalid, or no longer exists.", {
                label: "OK"
            }), uniqueId = 0, uniqueKey = 0, document.getElementById("joinCode").value = "") : e.code == CloseCode.gameFull ? openAlertDialog("GAME FULL", "Sorry, this game is currently full!<br>Wait a moment, or try another one!", {
                label: "OK"
            }) : e.code == CloseCode.badName ? (closeAlertDialog(), openAlertDialog("INVALID NAME", "I'm going to guess you know why.", {
                label: "Yes"
            }), (e = document.getElementById("username")).value = "", e.disabled = !1, e.focus(), document.getElementById("playButton").disabled = !1) : e.code == CloseCode.mainMenu || (inGame ? openAlertDialog("CONNECTION LOST", "Please try a different server,<br> or try again later!", {
                label: "OK",
                onclick: reloadPage
            }) : openAlertDialog("CANNOT CONNECT", "Please try a different server,<br> or try again later!<br>", {
                label: "OK",
                onclick: reloadPage
            })))
        }, ws.onmessage = function (e) {
            var i = new Comm.input(e.data);
            switch (i.unPackInt8U()) {
                case Comm.loggedIn:
                    meId = i.unPackInt8U(), myTeam = i.unPackInt8U(), gameType = i.unPackInt8U(), uniqueId = i.unPackInt16U(), uniqueKey = i.unPackInt16U(), mapIdx = i.unPackInt8U(), privateGame && inviteFriends(), inGame = !0, startGame()
            }
        }
    }
}

function setVolume(e) {
    settings.volume = e.value, localStorage.setItem("volume", settings.volume), BABYLON.Engine.audioEngine.setGlobalVolume(settings.volume)
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
    !e && scene ? (settings.shadowsEnabled = scene.shadowsEnabled, settings.highRes = 1 == engine.getHardwareScalingLevel(), document.getElementById("shadowsEnabled").checked = settings.shadowsEnabled, document.getElementById("highRes").checked = settings.highRes, localStorage.setItem("shadowsEnabled", settings.shadowsEnabled ? "true" : "false"), localStorage.setItem("highRes", settings.highRes ? "true" : "false")) : scene && (enableShadows(), increaseResolution())
}

function enableAutoDetail() {
    var e = new BABYLON.SceneOptimizerOptions(40, 4e3),
        i = new BABYLON.SceneOptimization(0);
    i.apply = disableShadows, e.optimizations.push(i);
    var t = new BABYLON.SceneOptimization(1);
    t.apply = lowerResolution, e.optimizations.push(t), BABYLON.SceneOptimizer.OptimizeAsync(scene, e)
}

function disableAutoDetail() {
    BABYLON.SceneOptimizer.Stop()
}

function disableShadows() {
    return scene.shadowsEnabled = !1, mapMesh && (mapMesh.material = Materials.mapNoShadow), !0
}

function enableShadows() {
    scene.shadowsEnabled = !0, mapMesh && (mapMesh.material = Materials.map)
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
    refactorConfigKeys(e), delete inputToControlMap[e.oldText], inputToControlMap[e.innerText] = e.id, controlEl = null, inGame && captureKeys(), window.onkeydown = null, window.onkeyup = null, localStorage.setItem("controlConfig", JSON.stringify(inputToControlMap))
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
    document.getElementById("bigAd").style.display = "block", setTimeout(function () {
        hideBigAd()
    }, 15e3)
}

function hideBigAd() {
    document.getElementById("bigAd").style.display = "none"
}

function startAlertBar() {
    var e = document.getElementById("alertFooter");
    e.style.display = "block", alertBarInterval = setInterval(function () {
        e.innerText += "-", e.innerText.length > 10 && (e.innerText = "-")
    }, 200)
}

function openAlertDialog(e, i, t, r, a) {
    document.getElementById("overlay").style.display = "block", document.getElementById("alertHeader").innerHTML = e, document.getElementById("alertMessage").innerHTML = i;
    n = document.getElementById("alertButton1");
    t ? (n.style.display = "inline-block", n.style.visibility = "visible", n.innerHTML = t.label || "OK", n.style.width = t.width || "80px", n.onclick = t.onclick || closeAlertDialog) : n.style.display = "none";
    var n = document.getElementById("alertButton2");
    r ? (n.style.display = "inline-block", n.style.visibility = "visible", n.innerHTML = r.label || "Cancel", n.style.width = r.width || "80px", n.onclick = r.onclick || closeAlertDialog) : n.style.display = "none", a ? startAlertBar() : (document.getElementById("alertFooter").style.display = "none", clearInterval(alertBarInterval)), document.exitPointerLock(), window.onkeydown = null, window.onkeyup = null
}

function closeAlertDialog() {
    document.getElementById("overlay").style.display = "none", document.getElementById("alertFooter").style.display = "none", document.getElementById("username").disabled = !1, clearInterval(alertBarInterval)
}

function resetGameUI() {
    document.getElementById("chatOut").value = "", document.getElementById("BEST_STREAK").innerText = "BEST KILL STREAK: 0", document.getElementById("KILL_BOX").style.display = "none", document.getElementById("DEATH_BOX").style.display = "none"
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
    if (openAlertDialog("LOADING", "Just a moment!", null, null, !0), document.getElementById("switchTeamButton").style.visibility = "hidden", document.getElementById("homeButton").style.visibility = "hidden", document.getElementById("friendsButton").style.visibility = "hidden", document.getElementById("game").style.display = "none", document.getElementById("inviteFriends").style.display = "none", resetGameUI(), inGame && (canvas.removeEventListener("click", onCanvasClick), canvas.removeEventListener("mousedown", onCanvasMouseDown), canvas.removeEventListener("mouseup", onCanvasMouseUp), canvas.removeEventListener("mousemove", onCanvasMouseMove), ws.close(CloseCode.mainMenu), ws = null, releaseKeys(), gameStartTime > 0)) {
        var e = Date.now() - gameStartTime;
        if (ga("send", "timing", "game", "play time", e), fbq("trackCustom", "EndGame", {
                timePlayed: e
            }), me && kills > 0) {
            var i = Math.floor(kills / Math.max(kills + deaths, 1) * 100);
            ga("send", "event", "player stats", "kill ratio", classes[me.charClass].name, i), ga("send", "event", "player stats", "best kill streak", classes[me.charClass].name, bestKillStreak)
        }
    }
    inGame = !1, scene = new BABYLON.Scene(engine), settings.autoDetail || (scene.shadowsEnabled = settings.shadowsEnabled), scene.fogMode = BABYLON.Scene.FOGMODE_EXP2, scene.fogColor = new BABYLON.Color3(0, 0, 0), scene.fogDensity = .1, scene.clearColor = new BABYLON.Color3(0, 0, 0), (light = new BABYLON.SpotLight("light", new BABYLON.Vector3(0, 10, .7), new BABYLON.Vector3(0, -1, .33), .75, 40, scene)).intensity = 1.5, light.autoUpdateExtends = !1;
    var t = new BABYLON.HemisphericLight("light2", new BABYLON.Vector3(-.25, 1, -.5), scene);
    t.intensity = .8, (t = new BABYLON.HemisphericLight("light3", new BABYLON.Vector3(0, -1, 0), scene)).intensity = .5, t.diffuse = new BABYLON.Color3(1, .8, .6), (shadowGen = new BABYLON.ShadowGenerator(1024, light)).useBlurExponentialShadowMap = !0, shadowGen.frustumEdgeFalloff = 1, light.shadowMinZ = 1, light.shadowMaxZ = 40, light.shadowFrustumSize = 10, shadowGen.blurScale = 2, shadowGen.blurBoxOffset = 1, camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, .2, 0), scene), scene.activeCameras.push(camera), camera.maxZ = 100, camera.fov = .5, camera.minZ = .1, camera.rotation.x = .12, loadResources(function () {
        document.getElementById("mainMenu").style.display = "block", document.getElementById("characterCanvasContainer").appendChild(canvas), resize(), closeAlertDialog(), onResourcesLoaded(), document.getElementById("username").disabled = !1
    })
}

function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)(i = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen) && i.call(document);
    else {
        var e = document.getElementById("container"),
            i = e.requestFullscreen || e.webkitRequestFullscreen || e.mozRequestFullScreen || e.msRequestFullscreen;
        i && (i.call(e), ga("send", "event", "fullscreen"))
    }
}

function onFullscreenChange() {
    engine.resize();
    var e = document.getElementById("container");
    e.style.display = "none", setTimeout(function () {
        e.style.display = "block"
    }, 1)
}

function openSettingsMenu() {
    ga("send", "event", "open settings"), document.getElementById("settings").style.display = "block", document.getElementById("help").style.display = "none", localStorage.setItem("hideHelp", 1)
}

function closeSettingsMenu() {
    document.getElementById("settings").style.display = "none"
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
        a = setInterval(function () {
            r++, t.style.opacity = r / 8, t.style.top = r / 2 - 3.5 + "em", 8 == r && (clearInterval(a), setTimeout(function () {
                a = setInterval(function () {
                    t.style.opacity = r / 8, t.style.top = r / 2 - 3.5 + "em", 0 == --r && (clearInterval(a), t.style.display = "none")
                }, 32)
            }, i))
        }, 32)
}

function isBadWord(e) {
    return e.toLowerCase().replace(/[^a-zA-Z0-9|!\|@]/g, "").replace(/6|g/g, "9").replace(/b/g, "6").replace(/\||l|i|1/g, "!").replace(/e/g, "3").replace(/a|@/g, "4").replace(/o/g, "0").replace(/s/g, "5").replace(/t/g, "7").replace(/7h3|my|y0ur|7h3!r|h!5|h3r/g, "").test(/(p3nu5|pu55y|6u7753x|fux|6u77h0!3|4n4!|4nu5|k!!!b!4ck5|murd3rb!4ck5|h!7!3r|w3764ck|v49!n4|94y|455h0!3|5uck|j3w|5p!c|ch!nk|n!994|n!993r|n!663r|5h!7|6!7ch|fuck|cun7|kkk|wh0r3|f49|7w47|p3n!|r4p3w0m|r4p39!r|r4p!57|r4p3r|r4p!n|c0ck|7!75|900k|d!ckh34d)/)
}

function PlayerActor(e) {
    this.player = e, this.mesh = new BABYLON.AbstractMesh("player", scene), this.bodyMesh = Meshes.egg.clone("egg", this.mesh), this.bodyMesh.position.y = .32, this.bodyMesh.parent = this.mesh, this.bodyMesh.player = this.player, this.bodyMesh.material = Materials.eggShell, this.explodeMesh = Meshes.eggExplode.clone("explode", this.mesh), this.explodeMesh.position.y = .32, this.explodeMesh.parent = this.mesh, this.explodeMesh.setMaterial(Materials.normalBackface), this.explodeMesh.setEnabled(!1), this.whiteMesh = Meshes.eggWhite.clone("white", this.mesh), this.whiteMesh.parent = this.explodeMesh, this.whiteMesh.setEnabled(!1), this.yolkMesh = Meshes.eggYolk.clone("yolk", this.mesh), this.yolkMesh.parent = this.explodeMesh, this.yolkMesh.setEnabled(!1), this.head = new BABYLON.AbstractMesh("head", scene), this.head.parent = this.mesh, this.head.position.y = .3, this.head.position.z = 0, this.gunContainer = new BABYLON.AbstractMesh("gunContainer", scene), this.gunContainer.parent = this.head, this.gunContainer.rotation.y = -.14, this.gunContainer.rotation.x = -.035, this.eye = new BABYLON.AbstractMesh("eye", scene), this.eye.position.y = .1, this.eye.position.x = .1, this.eye.parent = this.head, this.gripHand = Meshes.gripHand.clone("gripHand", this.gunContainer), this.gripHand.parent = this.gunContainer, this.gripHand.material = Materials.standard, this.foreHand = Meshes.foreHand.clone("foreHand", this.gunContainer), this.foreHand.parent = this.gunContainer, this.foreHand.material = Materials.standard, this.setShellColor(this.player.shellColor), shake = 0, shadowGen && shadowGen.getShadowMap().renderList.push(this.bodyMesh), inGame && (this.player.id == meId ? (this.gripHand.setRenderingGroupId(1), this.foreHand.setRenderingGroupId(1)) : (this.setupNameSprite(), this.showNameSprite()), inGame && this.updateTeam()), this.mesh.position.x = this.player.x, this.mesh.position.y = this.player.y, this.mesh.position.z = this.player.z, this.deathSound = Sounds.shellBurst.clone(), this.player.id == meId ? this.hitSound = new BABYLON.Sound("", "sound/hit.mp3", scene) : (this.hitSound = Sounds.hit.clone(), this.bodyMesh.attachSound(this.hitSound)), playOffline && (this.gripHand.setEnabled(!1), this.foreHand.setEnabled(!1)), this.bobbleIntensity = 0, this.scope = !1, this.zoomed = !1, this.hitSoundDelay = 0
}

function loadMapMeshes(e) {
    function i() {
        ++t == r.length && e()
    }
    Meshes.map = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ];
    var t = 0,
        r = [loadMeshes(["ground"], Meshes.map[1], !0, i), loadMeshes(["wall"], Meshes.map[2], !0, i), loadMeshes(["tree"], Meshes.map[3], !0, i), loadMeshes(["halfBlock"], Meshes.map[4], !0, i), loadMeshes(["ramp"], Meshes.map[5], !0, i), loadMeshes(["ladder"], Meshes.map[6], !0, i), loadMeshes(["tank"], Meshes.map[7], !0, i), loadMeshes(["lowWall"], Meshes.map[8], !0, i)]
}

function loadObjectMeshes(e) {
    loadMeshes(["egg", "eggExplode", "munitions", "muzzleFlash", "items", "reticle", "mountains", "sky"], Meshes, !1, e)
}

function loadSounds(e) {
    var i = {
        spatialSound: !0,
        distanceModel: "exponential",
        rolloffFactor: 1
    };
    Sounds.eggk47 = {
        fire: new BABYLON.Sound("fire", "sound/eggk47/fire.mp3", scene, null, i),
        dryFire: new BABYLON.Sound("dryFire", "sound/eggk47/dry fire.mp3", scene, null, i),
        cycle: new BABYLON.Sound("cycle", "sound/eggk47/full cycle.mp3", scene, null, i),
        insertMag: new BABYLON.Sound("insertMag", "sound/eggk47/insert mag.mp3", scene, null, i),
        removeMag: new BABYLON.Sound("removeMag", "sound/eggk47/remove mag.mp3", scene, null, i)
    }, Sounds.dozenGauge = {
        fire: new BABYLON.Sound("", "sound/dozenGauge/fire.mp3", scene, null, i),
        open: new BABYLON.Sound("", "sound/dozenGauge/open.mp3", scene, null, i),
        load: new BABYLON.Sound("", "sound/dozenGauge/load.mp3", scene, null, i),
        close: new BABYLON.Sound("", "sound/dozenGauge/close.mp3", scene, null, i)
    }, Sounds.csg1 = {
        fire: new BABYLON.Sound("", "sound/csg1/fire.mp3", scene, null, i),
        pullAction: new BABYLON.Sound("", "sound/csg1/pull action.mp3", scene, null, i),
        releaseAction: new BABYLON.Sound("", "sound/csg1/release action.mp3", scene, null, i)
    }, Sounds.cluck9mm = {
        fire: new BABYLON.Sound("fire", "sound/cluck9mm/fire.mp3", scene, null, i),
        removeMag: new BABYLON.Sound("", "sound/cluck9mm/remove mag.mp3", scene, null, i),
        insertMag: new BABYLON.Sound("", "sound/cluck9mm/insert mag.mp3", scene, null, i)
    }, Sounds.hammerClick = new BABYLON.Sound("", "sound/hammerClick.mp3", scene), Sounds.ammo = new BABYLON.Sound("", "sound/ammo.mp3", scene), Sounds.shellBurst = new BABYLON.Sound("", "sound/shellBurst.mp3", scene, null, i), Sounds.hit = new BABYLON.Sound("", "sound/hit.mp3", scene, null, i), Sounds.grenade = {
        explode: new BABYLON.Sound("", "sound/grenade.mp3", scene, null, i),
        beep: new BABYLON.Sound("", "sound/grenadeBeep.mp3", scene, null, i),
        pin: new BABYLON.Sound("", "sound/grenadePin.mp3", scene, null, i)
    }, Sounds.death = [];
    for (var t = 1; t < 11; t++) Sounds.death.push(new BABYLON.Sound("", "sound/death/scream" + t + ".mp3", scene, null, i))
}

function loadMaterials() {
    if (Materials.bullet = new BABYLON.StandardMaterial("bulletMaterial", scene), Materials.bullet.emissiveColor = new BABYLON.Color3(1, 1, 1), shadowGen) {
        e = ["#define RECEIVESHADOWS"];
        engineCaps.textureFloat && e.push("#define SHADOWFULLFLOAT")
    } else var e = [];
    e.push("#define DIRT"), Materials.map = new BABYLON.ShaderMaterial("", scene, "standard", {
        attributes: ["position", "normal", "color", "uv"],
        uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor"],
        defines: e
    }), shadowGen && (Materials.map.setTexture("shadowSampler", shadowGen.getShadowMapForRendering()), Materials.map.setMatrix("shadowLightMat", shadowGen.getTransformMatrix()), Materials.map.setVector3("shadowParams", shadowGen.getDarkness(), shadowGen.getShadowMap().getSize().width, shadowGen.bias)), Materials.map.onBind = function (e) {
        var i = Materials.map.getEffect();
        i.setFloat4("vFogInfos", scene.fogMode, scene.fogStart, scene.fogEnd, scene.fogDensity), i.setColor3("vFogColor", scene.fogColor)
    }, Materials.mapNoShadow = new BABYLON.ShaderMaterial("", scene, "standard", {
        attributes: ["position", "normal", "color", "uv"],
        uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor"],
        defines: ["#define DIRT"]
    }), Materials.mapNoShadow.onBind = function (e) {
        var i = Materials.mapNoShadow.getEffect();
        i.setFloat4("vFogInfos", scene.fogMode, scene.fogStart, scene.fogEnd, scene.fogDensity), i.setColor3("vFogColor", scene.fogColor)
    }, Materials.standard = new BABYLON.ShaderMaterial("", scene, "standard", {
        attributes: ["position", "normal", "color", "uv"],
        uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor", "colorMult"],
        defines: ["#define COLORMULT"]
    }), Materials.standard.onBind = function (e) {
        var i = Materials.standard.getEffect();
        i.setFloat4("vFogInfos", scene.fogMode, scene.fogStart, scene.fogEnd, scene.fogDensity), i.setColor3("vFogColor", scene.fogColor), i.setColor3("colorMult", e.colorMult || BABYLON.Color3.White())
    }, Materials.standardInstanced = new BABYLON.ShaderMaterial("", scene, "standard", {
        attributes: ["position", "normal", "color", "uv", "world0", "world1", "world2", "world3"],
        uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor"],
        defines: ["#define INSTANCES"]
    }), Materials.standardInstanced.onBind = function (e) {
        var i = Materials.standardInstanced.getEffect();
        i.setFloat4("vFogInfos", scene.fogMode, scene.fogStart, scene.fogEnd, scene.fogDensity), i.setColor3("vFogColor", scene.fogColor)
    }, Materials.eggShell = new BABYLON.ShaderMaterial("", scene, "standard", {
        attributes: ["position", "normal", "color", "uv"],
        uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor", "hp", "colorMult"],
        defines: ["#define EGGSHELL"]
    }), Materials.eggShell.onBind = function (e) {
        var i = Materials.eggShell.getEffect();
        i.setFloat4("vFogInfos", scene.fogMode, scene.fogStart, scene.fogEnd, scene.fogDensity), i.setColor3("vFogColor", scene.fogColor), i.setFloat("hp", e.player.hp / 100), i.setColor3("colorMult", e.colorMult || BABYLON.Color3.White())
    }, Materials.emissive = new BABYLON.ShaderMaterial("", scene, "standard", {
        attributes: ["position", "normal", "color", "uv"],
        uniforms: ["world", "view", "viewProjection", "vFogInfos", "vFogColor", "emissiveColor"],
        defines: ["#define FLASH"]
    }), Materials.emissive.onBind = function (e) {
        var i = Materials.emissive.getEffect();
        i.setFloat4("vFogInfos", scene.fogMode, scene.fogStart, scene.fogEnd, scene.fogDensity), i.setColor3("vFogColor", scene.fogColor), i.setColor3("emissiveColor", e.emissiveColor || BABYLON.Color3.Black())
    }, Materials.wireframe = new BABYLON.StandardMaterial("", scene), Materials.wireframe = !0, Materials.normalBackface = new BABYLON.StandardMaterial("", scene), Materials.normalBackface.diffuseColor = new BABYLON.Color3(.5, .5, .5), Materials.normalBackface.ambientColor = new BABYLON.Color3(.5, .5, .5), Materials.normalBackface.specularColor = new BABYLON.Color3(0, 0, 0), Materials.normalBackface.backFaceCulling = !1, Materials.normalBackface.twoSidedLighting = !0, Materials.muzzleFlash = new BABYLON.StandardMaterial("", scene), Materials.muzzleFlash.emissiveColor = BABYLON.Color3.White(), Materials.ui = new BABYLON.StandardMaterial("ui", scene), Materials.ui.disableLighting = !0, Materials.ui.emissiveColor = BABYLON.Color3.White(), Materials.ui.fogEnabled = !1, Materials.eggWhite = new BABYLON.StandardMaterial("eggWhite", scene), Materials.eggWhite.disableLighting = !0, Materials.eggWhite.alpha = .8, Materials.eggWhite.emissiveColor = BABYLON.Color3.White(), Materials.eggYolk = new BABYLON.StandardMaterial("eggYolk", scene), Materials.eggYolk.disableLighting = !0, Materials.eggYolk.emissiveColor = BABYLON.Color3.White()
}

function loadMeshes(e, i, t, r) {
    function a() {
        BABYLON.SceneLoader.ImportMesh("", "models/", e[d] + ".babylon", scene, function (e, s, y) {
            for (var l = 0; l < e.length; l++) {
                var h = e[l];
                h.setEnabled(!1), h.setMaterial(Materials.standard), h.isPickable = !1, t ? i.push(h) : i[h.name] = h
            }
            d++, 0 == --n ? r && r.call(o) : a()
        })
    }
    var n = e.length,
        o = this,
        d = 0;
    a()
}

function Bullet() {
    this.x = 0, this.y = 0, this.z = 0, this.dx = 0, this.dy = 0, this.dz = 0, this.ttl = 0, this.active = !1, this.player = null, this.damage = 20, void 0 !== BulletActor && (this.actor = new BulletActor(this))
}

function collidesWithCell(e, i, t) {
    if (!e || !i || !t || e < 0 || e >= map.width || t < 0 || t >= map.depth || i < 0 || i >= map.height) return !1;
    var r = Math.floor(e),
        a = Math.floor(i),
        n = Math.floor(t),
        o = map.data[r][a][n];
    if (o.cat) {
        if (o.cat == MAP.ramp) switch (o.dir) {
            case 0:
                if (i - a > t - n) return !1;
                break;
            case 2:
                if (i - a > 1 - (t - n)) return !1;
                break;
            case 1:
                if (i - a > e - r) return !1;
                break;
            case 3:
                if (i - a > 1 - (e - r)) return !1
        } else if (o.cat == MAP.column) {
            if ((y = e % 1 - .5) * y + (s = t % 1 - .5) * s > .04) return !1
        } else if (o.cat == MAP.halfBlock) {
            var d = i - a,
                s = t - n;
            if ((y = e - r) > .7 || y < .3 || s > .7 || s < .3 || d > .5) return !1
        } else if (o.cat == MAP.tank) {
            var y = e - r - .5,
                d = i - a - .5,
                s = t - n - .5;
            if (0 == o.dir || 2 == o.dir) {
                if (y * y + d * d >= .25) return !1
            } else if (s * s + d * d >= .25) return o
        } else {
            if (o.cat == MAP.ladder) return !1;
            if (o.cat == MAP.lowWall) {
                var y = e % 1,
                    s = t % 1;
                if ((d = i % 1) > .25) return !1;
                switch (o.dir) {
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
            y: a,
            z: n,
            cel: o
        }
    }
    return !1
}

function ab2str(e) {
    return String.fromCharCode.apply(null, new Uint8Array(e))
}

function str2ab(e) {
    for (var i = new Uint8Array(e.length), t = 0, r = e.length; t < r; t++) i[t] = e.charCodeAt(t);
    return i
}

function Grenade() {
    this.x = 0, this.y = 0, this.z = 0, this.dx = 0, this.dy = 0, this.dz = 0, this.ttl = 0, this.active = !1, this.player = null, void 0 !== GrenadeActor && (this.actor = new GrenadeActor(this))
}

function Gun(e) {
    this.player = e, this.highPrecision = !1
}

function Eggk47(e) {
    Gun.call(this, e), this.name = "EggK-47", this.ammo = {
        rounds: 30,
        capacity: 30,
        reload: 30,
        store: 240,
        storeMax: 240,
        pickup: 30
    }, this.rof = 3600 / 550, this.automatic = !0, this.accuracy = 14, this.shotSpreadIncrement = 42, this.accuracySettleFactor = .925, this.damage = 45, this.totalDamage = 45, this.ttl = 30, this.velocity = .5, this.range = this.ttl * this.velocity, this.equipTime = 15, this.stowWeaponTime = 15, this.longReloadTime = 125, this.shortReloadTime = 84, void 0 !== Eggk47Actor && (this.actor = new Eggk47Actor(this))
}

function DozenGauge(e) {
    Gun.call(this, e), this.name = "Dozen Gauge", this.ammo = {
        rounds: 2,
        capacity: 2,
        reload: 2,
        store: 24,
        storeMax: 24,
        pickup: 8
    }, this.rof = 15, this.automatic = !1, this.accuracy = 30, this.shotSpreadIncrement = 120, this.accuracySettleFactor = .9, this.damage = 10, this.totalDamage = 20 * this.damage, this.ttl = 15, this.velocity = .45, this.range = this.ttl * this.velocity, this.equipTime = 15, this.stowWeaponTime = 15, this.longReloadTime = 95, this.shortReloadTime = 95, void 0 !== DozenGaugeActor && (this.actor = new DozenGaugeActor(this))
}

function CSG1(e) {
    Gun.call(this, e), this.name = "CSG-1", this.ammo = {
        rounds: 5,
        capacity: 5,
        reload: 5,
        store: 15,
        storeMax: 15,
        pickup: 5
    }, this.rof = 60, this.automatic = !1, this.accuracy = 0, this.shotSpreadIncrement = 170, this.accuracySettleFactor = .95, this.damage = 250, this.totalDamage = 250, this.ttl = 80, this.velocity = .6, this.range = this.ttl * this.velocity, this.hasScope = !0, this.equipTime = 15, this.stowWeaponTime = 15, this.longReloadTime = 237, this.shortReloadTime = 140, this.highPrecision = !0, void 0 !== CSG1Actor && (this.actor = new CSG1Actor(this))
}

function Cluck9mm(e) {
    Gun.call(this, e), this.name = "Cluck 9mm", this.ammo = {
        rounds: 15,
        capacity: 15,
        reload: 15,
        store: 60,
        storeMax: 60,
        pickup: 15
    }, this.rof = 6, this.automatic = !1, this.accuracy = 30, this.shotSpreadIncrement = 100, this.accuracySettleFactor = .85, this.damage = 35, this.totalDamage = 35, this.ttl = 100, this.velocity = .45, this.range = this.ttl * this.velocity, this.equipTime = 15, this.stowWeaponTime = 15, this.longReloadTime = 113, this.shortReloadTime = 113, void 0 !== Cluck9mmActor && (this.actor = new Cluck9mmActor(this))
}

function MunitionsManager() {
    this.bulletPool = new Pool(function () {
        return new Bullet
    }, 200), this.grenadePool = new Pool(function () {
        return new Grenade
    }, 10)
}

function Player(e) {
    if (this.id = e.id, this.name = e.name, this.charClass = e.charClass, this.team = e.team, this.shellColor = e.shellColor, this.x = e.x, this.y = e.y, this.z = e.z, this.dx = e.dx, this.dy = e.dy, this.dz = e.dz, this.viewYaw = e.viewYaw, this.controlKeys = e.controlKeys, this.moveYaw = e.moveYaw, this.pitch = e.pitch, this.totalKills = e.totalKills, this.totalDeaths = e.totalDeaths, this.killStreak = e.killStreak, this.bestKillStreak = e.bestKillStreak, this.hp = e.hp, this.weaponIdx = e.weaponIdx, this.serverX = e.x, this.serverY = e.y, this.serverZ = e.z, this.clientCorrection = {
            x: 0,
            y: 0
        }, this.aimTarget = {
            x: 0,
            y: 0,
            z: 0
        }, this.rofCountdown = 0, this.triggerPulled = !1, this.shotsQueued = 0, this.reloadsQueued = 0, this.roundsToReload = 0, this.recoilCountdown = 0, this.reloadCountdown = 0, this.swapWeaponCountdown = 0, this.weaponSwapsQueued = 0, this.equipWeaponIdx = this.weaponIdx, this.shotSpread = 0, this.grenadeCount = 1, this.grenadeCapacity = 3, this.grenadeCountdown = 0, this.grenadesQueued = 0, this.jumping = !1, this.climbing = !1, this.bobble = 0, this.stateIdx = 0, this.timeOfDeath = 0, this.ready = !1, this.teamSwitchCooldown = 0, this.chatLineCap = 3, this.previousStates = [], void 0 !== PlayerActor) {
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
    this.weapons = [new Cluck9mm(this), new classes[this.charClass].weapon(this)], this.weapon = this.weapons[this.weaponIdx], this.actor && this.weapon.actor.equip()
}

function Pool(e, i) {
    this.size = 0, this.originalSize = i, this.constructorFn = e, this.objects = [], this.idx = 0, this.numActive = 0, this.expand(i)
}

function isBadWord(e) {
    var i = (e = " " + e + " ").toLowerCase().replace(/[^a-zA-Z0-9|!\|@|$| ]/g, "").replace(/6|g/g, "9").replace(/b/g, "6").replace(/\||l|i|1/g, "!").replace(/e/g, "3").replace(/a|@/g, "4").replace(/o/g, "0").replace(/s|\$/g, "5").replace(/t/g, "7").replace(/z/g, "2").replace(/7h3|my|y0ur|7h3!r|h!5|h3r/g, ""),
        t = i.search(/( 94y | cum| 455 )/);
    i.replace(/ /g, "");
    var r = /(p!55|7357!c|735735|64!!5|nu75|nu72|j3w|k!k3|r374r|4u7!5|d0wn55|6006|8d|p0rn|5w4!!0w|347d!ck|347m3|347my|d!k|0r4!|5p0093|fuk|j!2|5u!c!d|m4573r6|5p0063|5p3rm|p3nu5|pu55y|6u7753x|fux|6u77h0!3|4n4!|4nu5|k!!!b!4ck5|murd3rb!4ck5|h!7!3r|w3764ck|49!n4|94y|455h0!3|5uck|j3w|5p!c|ch!nk|n!994|n!993|n!663|n!994|n!664|5h!7|6!7ch|fuck|cun7|kkk|wh0r3|f49|7w47|p3n!|r4p3w0m|r4p39!r|r4p!57|r4p3r|r4p!n|c0ck|7!75|900k|d!ckh34d)/,
        a = i.search(r);
    i.replace(/(.)(?=\1)/g, "");
    var n = i.search(r);
    return t > -1 || a > -1 || n > -1
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
    Meshes = {},
    Materials = {},
    Sounds = {},
    mapMesh;
BABYLON.Mesh.prototype.attachToParent = function (e) {
    this.parent = e, this.position = BABYLON.Vector3.Zero(), this.rotation = BABYLON.Vector3.Zero(), this.rotationQuaternion = BABYLON.Quaternion.Identity()
}, BABYLON.AbstractMesh.prototype.getChildMeshByName = function (e) {
    for (var i = this.getChildMeshes(), t = 0; t < i.length; t++)
        if (i[t].name == e) return i[t];
    return null
}, BABYLON.AbstractMesh.prototype.setLayerMask = function (e) {
    this.layerMask = e;
    for (var i = this.getChildMeshes(), t = 0; t < i.length; t++) i[t].setLayerMask(e)
}, BABYLON.AbstractMesh.prototype.setRenderingGroupId = function (e) {
    this.renderingGroupId = e;
    for (var i = this.getChildMeshes(), t = 0; t < i.length; t++) i[t].setRenderingGroupId(e)
}, BABYLON.AbstractMesh.prototype.setVisible = function (e) {
    this.isVisible = e, e ? this.unfreezeWorldMatrix() : this.freezeWorldMatrix();
    for (var i = this.getChildMeshes(), t = 0; t < i.length; t++) i[t].setVisible(e)
}, BABYLON.AbstractMesh.prototype.setMaterial = function (e) {
    this.material = e;
    for (var i = this.getChildMeshes(), t = 0; t < i.length; t++) i[t].setMaterial(e)
}, BABYLON.AbstractMesh.prototype.attachSound = function (e) {
    this.attachedSounds || (this.attachedSounds = []), e.attachToMesh(this), this.attachedSounds.push(e)
}, BABYLON.AbstractMesh.prototype.disposeOfSounds = function () {
    if (this.attachedSounds)
        for (var e in this.attachedSounds) this.attachedSounds[e].detachFromMesh(), this.attachedSounds[e].dispose();
    for (var i = this.getChildMeshes(), t = 0; t < i.length; t++) i[t].disposeOfSounds()
};
var nameTexture, nameSprites, bulletHoleManager, explosionSmokeManager, explosionFireManager, respawnTime, players, keyIsDown, map, inputTally, light, camera, uiCamera, me, grenadeThrowPower, grenadePowerUp = !1,
    chatInEl, chatOutEl, killEl, lastTimeStamp, lastDelta, fps, fpsSum, fpsIdx, kills, deaths, bestKillStreak, teamColors = {
        text: ["rgba(255, 255, 255, 1)", "rgba(64, 224, 255, 1)", "rgba(255, 192, 160, 1)"],
        meBackground: ["rgba(255, 192, 64, 0.75)", "rgba(0, 192, 255, 0.8)", "rgba(192, 64, 32, 0.8)"],
        themBackground: ["rgba(0, 0, 0, 0.25)", "rgba(0, 64, 192, 0.3)", "rgba(192, 64, 32, 0.3)"],
        outline: [new BABYLON.Color4(1, 1, 1, 1), new BABYLON.Color4(0, .75, 1, 1), new BABYLON.Color4(1, .25, .25, 1)]
    },
    scope, reticle, hitIndicator, munitionsManager, itemManager, lastMouseMovement = {},
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
    controlToBitmask = {
        up: 1,
        down: 2,
        left: 4,
        right: 8
    },
    debugWindow;
Scope.prototype.show = function () {
    var e = engine.getRenderHeight();
    this.crosshairs.scaling.x = e / 2, this.crosshairs.scaling.y = e / 2, this.crosshairs.setEnabled(!0), this.sprite = new BABYLON.Sprite("", this.scopeSprite), this.sprite.size = e + 20, this.sprite.position.z = 1, camera.viewport.width = e / engine.getRenderWidth(), camera.viewport.x = .5 - .5 * camera.viewport.width
}, Scope.prototype.hide = function () {
    this.crosshairs.setEnabled(!1), this.sprite && this.sprite.dispose(), camera.viewport.width = 1, camera.viewport.x = 0
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
                r = me.shotSpread + me.weapon.accuracy;
            this.lines[i].position.x = -Math.sin(t) * r, this.lines[i].position.y = Math.cos(t) * r
        }
}, Reticle.prototype.resize = function () {
    var e = engine.getRenderHeight() / 640;
    this.mesh.scaling.x = e, this.mesh.scaling.y = e
};
var rays, rayIdx = 0,
    flashColors = [new BABYLON.Color3(1, 1, 0), new BABYLON.Color3(0, .5, 1), new BABYLON.Color3(1, 0, 0)];
GrenadeActor.prototype.throw = function () {
    this.mesh.setEnabled(!0), this.mesh.position.x = this.grenade.x, this.mesh.position.y = this.grenade.y, this.mesh.position.z = this.grenade.z, this.grenade.player.id == meId ? this.flashColor = flashColors[0] : this.flashColor = flashColors[this.grenade.player.team], this.pinSound.play(), this.bounce()
}, GrenadeActor.prototype.update = function () {
    this.mesh.position.x = this.grenade.x, this.mesh.position.y = this.grenade.y, this.mesh.position.z = this.grenade.z, this.mesh.rotation.x += this.rx, this.mesh.rotation.y += this.ry, this.mesh.rotation.z += this.rz, Math.sqrt(this.grenade.ttl) % 2 > 1 ? (0 == this.beep && (this.beepSound.play(), this.beep = !0), this.mesh.emissiveColor = this.flashColor) : (this.mesh.emissiveColor = BABYLON.Color3.Black(), this.beep = !1)
}, GrenadeActor.prototype.remove = function () {
    this.mesh.setEnabled(!1)
}, GrenadeActor.prototype.bounce = function () {
    var e = Math.length3(this.grenade.dx, this.grenade.dy, this.grenade.dz);
    this.rx = (4 * Math.random() - 2) * e, this.ry = (4 * Math.random() - 2) * e, this.rz = (4 * Math.random() - 2) * e
}, Eggk47Actor.prototype.addSoundEvent = function (e, i) {
    var t = new BABYLON.AnimationEvent(e, function () {
        i.play()
    });
    this.playerActor.gripHand.animations[0].addEvent(t), this.gunMesh.attachSound(i)
}, Eggk47Actor.prototype.animate = function (e, i, t) {
    scene.beginAnimation(this.playerActor.gripHand, e, i, !1, 1, t), scene.beginAnimation(this.playerActor.foreHand, e, i, !1, 1), scene.beginAnimation(this.gunMesh, e, i, !1, 1), scene.beginAnimation(this.clipMesh, e, i, !1, 1)
}, Eggk47Actor.prototype.dryFire = function () {
    this.dryFireSound.play()
}, Eggk47Actor.prototype.fire = function () {
    this.fireSound.play(), this.muzzleFlash.rotation.z = 3.141 * Math.random(), this.muzzleFlash.setEnabled(!0);
    var e = this;
    setTimeout(function () {
        e.muzzleFlash.setEnabled(!1)
    }, 40), this.animate(0, 6)
}, Eggk47Actor.prototype.reload = function () {
    var e = this;
    this.animate(7, 74, function () {
        e.gun.ammo.rounds > 0 ? e.animate(133, 154) : e.animate(74, 132)
    })
}, Eggk47Actor.prototype.stow = function () {
    var e = this;
    this.animate(154, 168, function () {
        e.gunMesh.setEnabled(!1), e.clipMesh.setEnabled(!1), e.gun.equip()
    })
}, Eggk47Actor.prototype.equip = function () {
    this.gunMesh.setEnabled(!0), this.clipMesh.setEnabled(!0), this.animate(168, 182)
}, Eggk47Actor.prototype.update = function () {}, DozenGaugeActor.prototype.addSoundEvent = function (e, i) {
    var t = new BABYLON.AnimationEvent(e, function () {
        i.play()
    });
    this.playerActor.gripHand.animations[0].addEvent(t), this.gunMesh.attachSound(i)
}, DozenGaugeActor.prototype.animate = function (e, i, t) {
    scene.beginAnimation(this.playerActor.gripHand, e, i, !1, 1, t), scene.beginAnimation(this.playerActor.foreHand, e, i, !1, 1), scene.beginAnimation(this.gunMesh, e, i, !1, 1), scene.beginAnimation(this.barrel, e, i, !1, 1)
}, DozenGaugeActor.prototype.dryFire = function () {
    this.dryFireSound.play()
}, DozenGaugeActor.prototype.fire = function () {
    this.fireSound.play(), this.muzzleFlash.rotation.z = 3.141 * Math.random(), this.muzzleFlash.setEnabled(!0);
    var e = this;
    setTimeout(function () {
        e.muzzleFlash.setEnabled(!1)
    }, 40), this.animate(300, 320)
}, DozenGaugeActor.prototype.reload = function () {
    this.animate(320, 415)
}, DozenGaugeActor.prototype.stow = function () {
    var e = this;
    this.animate(416, 433, function () {
        e.gunMesh.setEnabled(!1), e.gun.equip()
    })
}, DozenGaugeActor.prototype.equip = function () {
    this.gunMesh.setEnabled(!0), this.animate(433, 449)
}, DozenGaugeActor.prototype.update = function () {}, CSG1Actor.prototype.addSoundEvent = function (e, i) {
    var t = new BABYLON.AnimationEvent(e, function () {
        i.play()
    });
    this.playerActor.gripHand.animations[0].addEvent(t), this.gunMesh.attachSound(i)
}, CSG1Actor.prototype.animate = function (e, i, t) {
    scene.beginAnimation(this.playerActor.gripHand, e, i, !1, 1, t), scene.beginAnimation(this.playerActor.foreHand, e, i, !1, 1), scene.beginAnimation(this.gunMesh, e, i, !1, 1), scene.beginAnimation(this.clipMesh, e, i, !1, 1)
}, CSG1Actor.prototype.dryFire = function () {
    this.dryFireSound.play()
}, CSG1Actor.prototype.fire = function () {
    this.fireSound.play(), this.muzzleFlash.rotation.z = 3.141 * Math.random(), this.muzzleFlash.setEnabled(!0);
    var e = this;
    setTimeout(function () {
        e.muzzleFlash.setEnabled(!1)
    }, 40), this.animate(800, 860)
}, CSG1Actor.prototype.reload = function () {
    var e = this;
    e.gun.ammo.rounds > 0 ? this.animate(860, 1e3) : this.animate(1001, 1080, function () {
        e.animate(880, 952, function () {
            e.animate(1081, 1165)
        })
    })
}, CSG1Actor.prototype.stow = function () {
    var e = this;
    this.animate(1166, 1181, function () {
        e.gunMesh.setEnabled(!1), e.clipMesh.setEnabled(!1), e.gun.equip()
    })
}, CSG1Actor.prototype.equip = function () {
    this.gunMesh.setEnabled(!0), this.clipMesh.setEnabled(!0), this.animate(1181, 1196)
}, CSG1Actor.prototype.update = function () {}, Cluck9mmActor.prototype.addSoundEvent = function (e, i) {
    var t = new BABYLON.AnimationEvent(e, function () {
        i.play()
    });
    this.playerActor.gripHand.animations[0].addEvent(t), this.gunMesh.attachSound(i)
}, Cluck9mmActor.prototype.animate = function (e, i, t) {
    scene.beginAnimation(this.playerActor.gripHand, e, i, !1, 1, t), scene.beginAnimation(this.playerActor.foreHand, e, i, !1, 1), scene.beginAnimation(this.gunMesh, e, i, !1, 1), scene.beginAnimation(this.clipMesh, e, i, !1, 1)
}, Cluck9mmActor.prototype.dryFire = function () {
    this.dryFireSound.play()
}, Cluck9mmActor.prototype.fire = function () {
    this.fireSound.play(), this.muzzleFlash.rotation.z = 3.141 * Math.random(), this.muzzleFlash.setEnabled(!0);
    var e = this;
    setTimeout(function () {
        e.muzzleFlash.setEnabled(!1)
    }, 40), this.animate(600, 606)
}, Cluck9mmActor.prototype.reload = function () {
    this.animate(607, 720)
}, Cluck9mmActor.prototype.stow = function () {
    var e = this;
    this.animate(721, 735, function () {
        e.gunMesh.setEnabled(!1), e.gun.equip()
    })
}, Cluck9mmActor.prototype.equip = function () {
    this.gunMesh.setEnabled(!0), this.animate(735, 750)
}, Cluck9mmActor.prototype.update = function () {}, ItemActor.prototype.update = function (e) {
    this.mesh.rotation.y += .03 * e
}, ItemActor.prototype.remove = function () {
    this.mesh.setEnabled(!1)
}, AmmoActor.prototype = Object.create(ItemActor.prototype), AmmoActor.prototype.constructor = ItemActor, GrenadeItemActor.prototype = Object.create(ItemActor.prototype), GrenadeItemActor.prototype.constructor = ItemActor, ItemManager.AMMO = 0, ItemManager.GRENADE = 1, ItemManager.Constructors = [AmmoActor, GrenadeItemActor], ItemManager.prototype.update = function (e) {
    for (var i = 0; i < this.pools.length; i++) this.pools[i].forEachActive(function (i) {
        i.update(e), i.mesh.isVisible = isMeshVisible(i.mesh)
    })
}, ItemManager.prototype.spawnItem = function (e, i, t, r, a) {
    var n = this.pools[i].retrieve(e);
    n.mesh.setEnabled(!0), n.mesh.position.x = t, n.mesh.position.y = r, n.mesh.position.z = a
}, ItemManager.prototype.collectItem = function (e, i) {
    this.pools[e].recycle(this.pools[e].objects[i]), this.pools[e].objects[i].remove()
};
var fbAppId = "503435033333554",
    engine, scene, canvas, shadowGen, camera, light, engineCaps, ws, selectedClass, selectedServer, selectedColor, meId, myTeam, username, gameSession, facebookId, gameStartTime, pingTotal, pingSamples, fpsTotal, fpsSamples, nextPingSample, inGame = !1,
    uniqueId, uniqueKey, mapIdx, gameType, privateGame, playOffline = !1,
    mapTest = {},
    settings = {},
    nameTestCanvas = document.createElement("canvas"),
    lastErrorMessage = "No errors thrown",
    freezeFrame = !1,
    stateLog, highestPing = 0;
window.onerror = function (e, i, t, r, a) {
    return e.toLowerCase().indexOf("script error") > -1 || (lastErrorMessage = ["Message: " + e, "URL: " + i, "Line: " + t, "Column: " + r, "Error object: " + JSON.stringify(a)].join("\n")), !1
};
var shellColors = ["#ffffff", "#c4e3e8", "#e2bc8b", "#d48e52", "#cb6d4b", "#8d3213", "#5e260f", "#99953a"],
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
! function (e, i, t, r, a, n, o) {
    e.GoogleAnalyticsObject = a, e[a] = e[a] || function () {
        (e[a].q = e[a].q || []).push(arguments)
    }, e[a].l = 1 * new Date, n = i.createElement(t), o = i.getElementsByTagName(t)[0], n.async = 1, n.src = "https://www.google-analytics.com/analytics.js", o.parentNode.insertBefore(n, o)
}(window, document, "script", 0, "ga"), ga("create", "UA-105800112-1", "auto"), ga("send", "pageview"), window.addEventListener("contextmenu", function (e) {
    e.preventDefault()
}, !1), window.onresize = function () {
    resize()
}, window.onload = function () {
    function e(e) {
        console.log(e), facebookId = null, gameSession = null, u = e;
        var i = document.getElementById("ritekit-alerts");
        i && (i.style.visibility = "hidden"), "connected" === e.status ? (document.getElementById("fbLoginRequest").style.display = "none", document.getElementById("fbLogin").style.display = "none", document.getElementById("statsRetrieval").style.display = "block", facebookId = e.authResponse.userID, getRequest("!host_specific/requestUserData.php?id=" + e.authResponse.userID + "&token=" + e.authResponse.accessToken, function (e) {
            try {
                var i = JSON.parse(e);
                if (i.error) document.getElementById("stats").innerText = "DB error: " + i.error;
                else {
                    var t = Math.floor(i.kills / Math.max(i.kills + i.deaths, 1) * 100);
                    document.getElementById("stats").innerHTML = i.kills.toLocaleString() + "<br>" + i.deaths.toLocaleString() + "<br>" + t + "%<br>" + i.streak.toLocaleString(), document.getElementById("statsRetrieval").style.display = "none", document.getElementById("statsPane").style.display = "block", gameSession = i.session
                }
            } catch (i) {
                document.getElementById("stats").innerHTML = e
            }
        })) : (u = {
            status: null
        }, document.getElementById("fbLoginRequest").style.display = "block", document.getElementById("fbLogin").style.display = "block")
    }
    resize(), document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
    var i = "",
        t = 0;
    if (BABYLON.Engine.isSupported() || (i += '<li>WebGL (<a href="https://shellshock.io/faq.html#webgl" target="_window">More info</a>)', t++), document.exitPointerLock || (i += '<li>Pointer Lock (<a href="https://shellshock.io/faq.html#pointerlock" target="_window">More info</a>)', t++), localStorage || (i += "<li>LocalStorage", t++), void 0 === new KeyboardEvent("").key && (i += "<li>KeyboardEvent.key", t++), t > 0) return i = 1 == t ? "Your browser is missing a feature that Shell Shockers requires:<br><ul>" + i + "</ul>" : "Your browser is missing features that Shell Shockers requires:<br><ul>" + i + "</ul>", i += "Downloading the latest version of your browser of choice will usually correct this. Internet Explorer is not supported.", void openAlertDialog("OH, NO!", '<div style="text-align: left">' + i + "</div>");
    selectedServer = getStoredNumber("selectedServer", 0);
    for (var r = document.getElementById("serverSelect"), a = 0; a < servers.length; a++)(o = servers[a]).el = document.createElement("option"), o.el.textContent = o.name, r.appendChild(o.el);
    r.selectedIndex = selectedServer;
    for (var n = 1e6, a = 0; a < servers.length; a++) {
        var o = servers[a];
        (h = o.el).pinger = new WebSocket("wss://" + servers[a].address), h.pinger.pingStart = Date.now(), h.pinger.idx = a, h.pinger.onopen = function (e) {
            var i = Date.now() - e.target.pingStart;
            i < n && (selectServer(e.target.idx), r.selectedIndex = selectedServer, n = i), e.target.close()
        }
    }
    settings.volume = getStoredNumber("volume", 1), settings.mouseSensitivity = Math.max(Math.min(11, getStoredNumber("mouseSensitivity", 5)), 0), settings.mouseInvert = getStoredNumber("mouseInvert", 1), settings.holdToAim = getStoredBool("holdToAim", !0), settings.enableChat = getStoredBool("enableChat", !1), settings.autoDetail = getStoredBool("autoDetail", !0), settings.shadowsEnabled = getStoredBool("shadowsEnabled", !0), settings.highRes = getStoredBool("highRes", !0), gameType = getStoredNumber("gameType", GameType.ffa), document.getElementById("volume").value = settings.volume, document.getElementById("mouseSensitivity").value = settings.mouseSensitivity, document.getElementById("mouseInvert").checked = -1 == settings.mouseInvert, document.getElementById("holdToAim").checked = settings.holdToAim, document.getElementById("enableChat").checked = settings.enableChat, document.getElementById("autoDetail").checked = settings.autoDetail, document.getElementById("shadowsEnabled").checked = settings.shadowsEnabled, document.getElementById("highRes").checked = settings.highRes, setDetailSettingsVisibility(settings.autoDetail);
    var d = JSON.parse(localStorage.getItem("controlConfig"));
    for (var s in d) d.hasOwnProperty(s) && (inputToControlMap[s] = d[s]);
    for (var y in inputToControlMap) {
        var l = "" + y;
        inputToControlMap.hasOwnProperty(l) && l != l.toLocaleUpperCase() && (delete inputToControlMap[l], inputToControlMap[l.toLocaleUpperCase()] = inputToControlMap[y])
    }
    for (var s in inputToControlMap) {
        var h = document.getElementById(inputToControlMap[s]);
        h && (h.innerText = ("" + s).toLocaleUpperCase(), h.style.fontWeight = "bold", h.style.color = "#fff")
    }
    for (var x = document.getElementById("playerList"), c = document.getElementById("playerSlot"), a = 0; a < 20; a++) {
        var z = c.cloneNode(!0);
        x.appendChild(z)
    }
    getStoredNumber("hideHelp", null) && (document.getElementById("help").style.display = "none"), setupGameTypeButtons();
    var u = {
        status: null
    };
    if (window.checkLoginState = function () {
            FB.getLoginStatus(function (i) {
                e(i)
            })
        }, window.fbAsyncInit = function () {
            FB.init({
                appId: fbAppId,
                cookie: !0,
                xfbml: !0,
                version: "v2.8"
            }), FB.AppEvents.logPageView(), FB.getLoginStatus(function (i) {
                e(i)
            }), FB.Event.subscribe("auth.login", function (i) {
                e(i)
            })
        }, function (e, i, t) {
            var r, a = e.getElementsByTagName(i)[0];
            e.getElementById(t) || ((r = e.createElement(i)).id = t, r.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.11&appId=" + fbAppId, a.parentNode.insertBefore(r, a))
        }(document, "script", "facebook-jssdk"), canvas = document.createElement("canvas"), document.getElementById("offCanvasContainer").appendChild(canvas), resize(), engine = new BABYLON.Engine(canvas, !0, null, !1), engineCaps = engine.getCaps(), settings.autoDetail || settings.highRes || lowerResolution(), "?openSettings" == window.location.search && openSettingsMenu(), window.location.search.startsWith("?testMap")) {
        playOffline = !0;
        var m = window.location.search.split("&");
        mapTest.x = Number(m[1]), mapTest.y = Number(m[2]), mapTest.z = Number(m[3]), mapTest.pitch = Number(m[4]), mapTest.yaw = Number(m[5])
    }
    window.location.hash && (openJoinBox(), document.getElementById("joinCode").value = window.location.hash.substr(1));
    var p = document.getElementById("username");
    p.value = getStoredString("lastUsername", ""), p.addEventListener("keyup", function (e) {
        p.value = fixStringWidth(e.target.value), "Enter" != e.code && 13 != e.keyCode || p.value.length > 0 && (p.disabled = !0, login())
    }), playOffline ? (ws = {
        send: function () {}
    }, inGame = !0, startGame()) : showMainMenu()
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
var shake;
PlayerActor.prototype.drawTextOnNameTexture = function (e, i, t, r, a, n) {
    var o = [{
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
        d = [{
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
    i += this.player.id % 4 * 512, t = -t + (2048 - 256 * Math.floor(this.player.id / 4)), n && (i += 256 - getFloatingNameWidth(e, r) / 2);
    for (s = 0; s < 4; s++) nameTexture.drawText(e, i + o[s].x, t + o[s].y, "bold " + r + "px Nunito, sans-serif", "rgba(0, 0, 0, 0.5)", "transparent");
    for (var s = 0; s < 4; s++) nameTexture.drawText(e, i + d[s].x, t + d[s].y, "bold " + r + "px Nunito, sans-serif", a, "transparent")
}, PlayerActor.prototype.setupNameSprite = function () {
    var e = this.player.id % 4 * 512,
        i = 2048 - 256 * Math.floor(this.player.id / 4);
    nameTexture.clearRect(e, i - 256, 512, 256), this.drawTextOnNameTexture(this.player.name, 0, 32, 60, "white", !0)
}, PlayerActor.prototype.updateTeam = function () {
    this.player.id == meId ? (document.getElementById("blueTeam").style.display = 1 == this.player.team ? "block" : "none", document.getElementById("redTeam").style.display = 2 == this.player.team ? "block" : "none") : this.player.team > 0 && (this.player.team == myTeam ? (this.bodyMesh.renderOutline = !0, this.bodyMesh.outlineColor = teamColors.outline[this.player.team], this.bodyMesh.outlineWidth = .01, this.nameSprite && (this.nameSprite.color = teamColors.outline[this.player.team])) : this.bodyMesh.renderOutline = !1)
}, PlayerActor.prototype.update = function (e) {
    var i = Math.cos(this.player.bobble) * this.bobbleIntensity,
        t = Math.abs(Math.sin(this.player.bobble) * this.bobbleIntensity),
        r = Math.sin(2 * this.player.bobble) * this.bobbleIntensity;
    if (this.player.id == meId) this.scope && this.player.isAtReady(!0) ? (camera.fov = camera.fov + (this.player.weapon.actor.scopeFov - camera.fov) / 3, this.gunContainer.rotation.y *= .667, this.gunContainer.rotation.x *= .667, this.gunContainer.position.x += (-.15 - this.gunContainer.position.x) / 3, this.gunContainer.position.y += (this.player.weapon.actor.scopeY - this.gunContainer.position.y) / 4, this.gunContainer.position.z += (-.05 - this.gunContainer.position.z) / 3, this.player.weapon.hasScope && !this.zoomed && camera.fov < this.player.weapon.actor.scopeFov + .05 && (scope.show(), this.gunContainer.setEnabled(!1), this.zoomed = !0)) : (camera.fov = camera.fov + (1.25 - camera.fov) / 3, this.gunContainer.rotation.y += (2 * i - .14 - this.gunContainer.rotation.y) / 3, this.gunContainer.rotation.x += (.75 * r - .035 - this.gunContainer.rotation.x) / 3, this.gunContainer.position.x *= .667, this.gunContainer.position.y *= .667, this.gunContainer.position.z *= .667, this.zoomed && camera.fov > this.player.weapon.actor.scopeFov + .05 && (scope.hide(), this.gunContainer.setEnabled(!0), this.zoomed = !1));
    else if (this.player.team > 0 && this.player.team == myTeam && this.nameSprite) {
        var a = Math.length3(this.player.x - me.x, this.player.y - me.y, this.player.z - me.z),
            n = Math.pow(a, 1.25);
        this.nameSprite.width = n / 10 + .6, this.nameSprite.height = n / 20 + .3, this.bodyMesh.outlineWidth = Math.pow(a, .75) / 80
    }
    var o = this.player.x - this.mesh.position.x,
        d = this.player.y - this.mesh.position.y,
        s = this.player.z - this.mesh.position.z;
    (a = Math.length3(o, d, s)) < .5 ? (this.mesh.position.x += o / 4, this.mesh.position.y += d / 4, this.mesh.position.z += s / 4) : (this.mesh.position.x = this.player.x, this.mesh.position.y = this.player.y, this.mesh.position.z = this.player.z);
    var y = .9;
    this.player.id != meId && (y = .5);
    var l = Math.radDifference(this.player.viewYaw, this.mesh.rotation.y),
        h = Math.radDifference(this.player.pitch, this.head.rotation.x);
    this.player.addRotationShotSpread(l, h), this.mesh.rotation.y += l * y, this.head.rotation.x += h * y, this.bodyMesh.rotation.x = this.head.rotation.x / 4;
    var x;
    if (x = this.player.jumping ? 0 : Math.length3(this.player.dx, this.player.dy, this.player.dz), this.bobbleIntensity += (x - this.bobbleIntensity) / 10, this.bodyMesh.rotation.z = 5 * i, this.bodyMesh.position.y = 1.5 * t + .32, shake > 0)
        if ((shake *= .9) < .001) shake = 0;
        else {
            var c = Math.random() * shake - .5 * shake,
                z = Math.random() * shake - .5 * shake,
                u = Math.random() * shake - .5 * shake;
            this.eye.rotation.x += (c - this.eye.rotation.x) / 10, this.eye.rotation.y += (z - this.eye.rotation.y) / 10, this.eye.rotation.z += (u - this.eye.rotation.z) / 10
        }
    else this.eye.rotation.x *= .9, this.eye.rotation.y *= .9, this.eye.rotation.z *= .9;
    if (this.player.id != meId) {
        var m = isMeshVisible(this.mesh, .31);
        m != this.bodyMesh.isVisible && (this.mesh.setVisible(m), m ? this.showNameSprite() : this.hideNameSprite()), this.nameSprite && (this.nameSprite.position.x = this.mesh.position.x, this.nameSprite.position.y = this.mesh.position.y + .5 * this.nameSprite.height + .65, this.nameSprite.position.z = this.mesh.position.z)
    }
    this.hitSoundDelay = Math.max(this.hitSoundDelay - e, 0)
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
    this.bodyMesh.setEnabled(!1), this.head.setEnabled(!1), this.eye.setEnabled(!1), this.player.id == meId && (scope.hide(), this.gunContainer.setEnabled(!0), this.zoomed = !1, this.scope = !1, camera.fov = 1.25, document.getElementById("grenadeThrowContainer").style.visibility = "hidden"), this.hideNameSprite()
}, PlayerActor.prototype.respawn = function () {
    this.bodyMesh.setEnabled(!0), this.head.setEnabled(!0), this.eye.setEnabled(!0), this.player.id != meId && this.showNameSprite(), this.explodeMesh.setEnabled(!1), this.whiteMesh.setEnabled(!1), this.yolkMesh.setEnabled(!1)
}, PlayerActor.prototype.remove = function () {
    this.mesh.disposeOfSounds(), this.mesh.dispose(), this.hideNameSprite()
}, PlayerActor.prototype.fire = function () {
    this.zoomed && this.player.weapon.hasScope && (shake = .25, this.eye.rotation.x = -.1)
}, PlayerActor.prototype.reachForGrenade = function () {
    this.oldHandPos = this.foreHand.position, this.oldHandRot = this.foreHand.rotationQuaternion, this.oldHandParent = this.foreHand.parent, this.foreHand.parent = this.gunContainer, scene.beginAnimation(this.foreHand, 1300, 1315, !1, 1)
}, PlayerActor.prototype.throwGrenade = function () {
    var e = this;
    this.player.id == meId && (document.getElementById("grenadeThrowContainer").style.visibility = "hidden"), this.player.id != meId && (this.oldHandPos = this.foreHand.position, this.oldHandRot = this.foreHand.rotationQuaternion, this.oldHandParent = this.foreHand.parent, this.foreHand.parent = this.gunContainer), scene.beginAnimation(this.foreHand, 1315, 1350, !1, 1, function () {
        e.foreHand.position = e.oldHandPos, e.foreHand.rotationQuaternion = e.oldHandRot, e.foreHand.parent = e.oldHandParent
    })
}, PlayerActor.prototype.setShellColor = function (e) {
    var i = BABYLON.Color3.FromHexString(shellColors[e]);
    this.bodyMesh.colorMult = i, this.gripHand.colorMult = i, this.foreHand.colorMult = i
}, BABYLON.Effect.ShadersStore.standardVertexShader = "\n#include<instancesDeclaration>\n\nprecision lowp float;\n\n// Attributes\nattribute vec3 position;\nattribute vec3 normal;\nattribute vec4 color;\nattribute vec2 uv;\n\n// Uniforms\nuniform mat4 view;\nuniform mat4 viewProjection;\nuniform mat4 shadowLightMat;\nuniform vec3 colorMult;\n\n// Varying\nvarying vec4 vPositionFromLight;\nvarying vec3 vNormal;\nvarying vec4 vColor;\nvarying vec4 vEmissiveColor;\nvarying float fFogDistance;\n\nfloat random(vec3 p)\n{\nvec3 K1 = vec3(23.14069263277926, 2.665144142690225, 8.2318798443);\nreturn fract(cos(dot(p, K1)) * 12345.6789);\n}\n\n// MAIN\nvoid main(void) {\n#include<instancesVertex>\nvec4 worldPosition = finalWorld * vec4(position, 1.);\n\n#ifdef RECEIVESHADOWS\nvPositionFromLight = shadowLightMat * worldPosition;\n#endif\n\nvNormal = normalize(vec3(finalWorld * vec4(normal, 0.0)));\nvColor = color;\n\n#ifdef COLORMULT\nvColor.rgb *= colorMult;\n#endif\n\n#ifdef DIRT\nvColor.rgb *= random(worldPosition.xyz) * 0.2 + 0.7;\n#endif\n\nfFogDistance = (view * worldPosition).z;\ngl_Position = viewProjection * worldPosition;\n}\n", BABYLON.Effect.ShadersStore.standardPixelShader = "\n#define FOGMODE_NONE 0.\n#define FOGMODE_EXP 1.\n#define FOGMODE_EXP2 2.\n#define FOGMODE_LINEAR 3.\n#define E 2.71828\n\nprecision lowp float;\n\n// Uniforms\nuniform sampler2D shadowSampler;\nuniform vec3 shadowParams;\nuniform vec4 vFogInfos;\nuniform vec3 vFogColor;\nuniform vec3 emissiveColor;\nuniform mat4 worldView;\nuniform float hp;\nuniform vec3 colorMult;\n\n// Varying\nvarying vec4 vPositionFromLight;\nvarying vec4 vColor;\nvarying vec3 vNormal;\nvarying float fFogDistance;\n\nconst float sOff = .001;\n\n// FUNCTIONS\nfloat unpack(vec4 color)\n{\nconst vec4 bit_shift = vec4(1.0 / (255.0 * 255.0 * 255.0), 1.0 / (255.0 * 255.0), 1.0 / 255.0, 1.0);\nreturn dot(color, bit_shift);\n}\n\nfloat random(vec2 p)\n{\nvec2 K1 = vec2(23.14069263277926, 2.665144142690225);\nreturn fract(cos(dot(p, K1)) * 12345.6789);\n}\n\nfloat calcFogFactor()\n{\nfloat fogCoeff = 1.0;\nfloat fogStart = vFogInfos.y;\nfloat fogEnd = vFogInfos.z;\nfloat fogDensity = vFogInfos.w;\n\nfogCoeff = 1.0 / pow(E, fFogDistance * fFogDistance * fogDensity * fogDensity * 4.); // Exp2\n\nreturn clamp(fogCoeff, 0.0, 1.0);\n}\n\nfloat computeShadow(vec4 vPositionFromLight, sampler2D shadowSampler, float darkness)\n{\nvec3 depth = vPositionFromLight.xyz / vPositionFromLight.w;\ndepth = 0.5 * depth + vec3(0.5);\nvec2 uv = depth.xy;\n\nif (uv.x < 0. || uv.x > 1.0 || uv.y < 0. || uv.y > 1.0)\n{\nreturn 1.0;\n}\n\n#ifndef SHADOWFULLFLOAT\nfloat shadow = unpack(texture2D(shadowSampler, uv));\n#else\nfloat shadow = texture2D(shadowSampler, uv).x;\n#endif\n\nif (depth.z < shadow) return 1.;\nfloat s = clamp((depth.z - shadow) * 12. + 0.5, 0.5, 1.0);\nreturn min(1.0, max(s, length(vPositionFromLight.xy)));\n}\n\nvec3 desaturate(vec3 color, float amount)\n{\nvec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), color));\nreturn vec3(mix(color, gray, amount));\n}\n\n// MAIN\nvoid main(void)\n{\nvec4 color = vColor;\n\n#ifdef EGGSHELL // Show cracks!\ncolor.rgb = min((color.rgb - 0.5) * 4. + hp + 2., 1.);\ncolor.rgb *= colorMult;\n#endif\n\n#ifdef RECEIVESHADOWS\nfloat s = computeShadow(vPositionFromLight, shadowSampler, shadowParams.x);\n{\ncolor *= vec4(s, s, s, 1.);\n}\n#endif\n\ncolor.rgb *= max(max(0., -vNormal.y * 0.4), dot(vNormal, normalize(vec3(-.2, 1., -.1)) * 1.) + 0.4);\n\n#ifdef FLASH\ncolor.rgb += emissiveColor;\n#endif\n\nfloat fog = calcFogFactor();\ncolor.rgb = fog * color.rgb + (1.0 - fog) * vFogColor;\n\ngl_FragColor = color;\n}\n", Bullet.prototype.remove = function () {
    munitionsManager.bulletPool.recycle(this), this.actor && this.actor.remove()
}, Bullet.prototype.update = function (e) {
    this.ttl <= 0 || this.collidesWithMap() ? this.remove() : (this.x += this.dx * e, this.y += this.dy * e, this.z += this.dz * e, this.ttl -= e, this.actor && this.actor.update())
}, Bullet.prototype.fire = function (e, i, t, r, a, n) {
    this.player = e, this.x = i.x, this.y = i.y, this.z = i.z, this.dx = t.x * n, this.dy = t.y * n, this.dz = t.z * n, this.ttl = a, this.damage = r, this.active = !0, this.actor && this.actor.fire()
}, Bullet.prototype.collidesWithMap = function () {
    var e = collidesWithCell(this.x, this.y, this.z);
    if (e) {
        if (this.actor) {
            var i = map.data[e.x][e.y][e.z];
            if (i && i.cat > 0 && Meshes.map[i.cat][i.dec]) {
                var t = new BABYLON.Ray(new BABYLON.Vector3(this.x - this.dx - e.x - .5, this.y - this.dy - e.y, this.z - this.dz - e.z - .5), new BABYLON.Vector3(this.dx, this.dy, this.dz), new BABYLON.Vector3(this.dx, this.dy, this.dz).length);
                Meshes.map[i.cat][i.dec].rotation.y = i.dir * rotInc;
                var r = t.intersectsMesh(Meshes.map[i.cat][i.dec], !1);
                if (r.hit) {
                    var a = new BABYLON.Vector3(-this.dx, -this.dy, -this.dz).normalize().scale(.005);
                    bulletHoleManager.addHole(0, r.pickedPoint.x + e.x + .5 + a.x, r.pickedPoint.y + e.y + a.y, r.pickedPoint.z + e.z + .5 + a.z)
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
        loggedIn: 0,
        addPlayer: 1,
        removePlayer: 2,
        chat: 3,
        keyDown: 4,
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
        login: 20,
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
                    var a = this.unPackInt16U();
                    a > 0 && (t += String.fromCharCode(a))
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
        todo3: 9
    },
    GameType = {
        ffa: 0,
        teams: 1
    },
    SyncRate = 8,
    GameMap = {
        makeMinMap: function (e) {
            e.min = {}, e.min.width = e.width, e.min.depth = e.depth, e.min.height = e.height, e.min.data = {};
            for (var i = 0; i < e.width; i++)
                for (var t = 0; t < e.height; t++)
                    for (var r = 0; r < e.depth; r++) {
                        var a = e.data[i][t][r];
                        a.cat && (e.min.data[a.cat] || (e.min.data[a.cat] = {}), e.min.data[a.cat][a.dec] || (e.min.data[a.cat][a.dec] = []), e.min.data[a.cat][a.dec].push({
                            x: i,
                            y: t,
                            z: r,
                            dir: a.dir
                        }))
                    }
        },
        generateMap: function (e, i, t, r) {
            Math.seed = r;
            var a = {};
            a.width = e, a.depth = i, a.height = t, a.seed = r, a.data = Array(a.width);
            for (s = 0; s < a.width; s++) {
                a.data[s] = Array(a.height);
                for (c = 0; c < a.height; c++) a.data[s][c] = Array(a.depth).fill({})
            }
            for (z = 0; z < a.width * a.depth * a.height * .2;)
                for (var n = Math.seededRandomInt(4, 8), o = Math.seededRandomInt(4, 8), d = Math.seededRandomInt(2, z % a.height), s = Math.seededRandomInt(1, a.width - 1 - n), y = Math.seededRandomInt(1, a.depth - 1 - o), l = (Math.seededRandomInt(1, 4), s); l < s + n; l++)
                    for (p = y; p < y + o; p++)
                        for (var h = 0; h < d; h++) {
                            var x = l == s || p == y || l == s + n - 1 || p == y + o - 1;
                            a.data[l][h][p].cat || z++, a.data[l][h][p] = x ? {
                                cat: 1,
                                dec: 4,
                                dir: Math.seededRandomInt(0, 4)
                            } : h % 2 == 0 ? {
                                cat: 1,
                                dec: 0,
                                dir: Math.seededRandomInt(0, 4)
                            } : {
                                cat: 1,
                                dec: 4,
                                dir: Math.seededRandomInt(0, 4)
                            }
                        }
            for (s = 0; s < a.width; s++)
                for (c = 0; c < a.height; c++)
                    for (y = 0; y < a.depth; y++) 0 == a.data[s][c][y].dec && (a.data[s][c][y] = {});
            for (u = 0; u < a.width * a.depth * a.height / 2; u++) {
                var s = Math.seededRandomInt(0, a.width),
                    c = 2 * Math.seededRandomInt(0, Math.floor(a.height / 2)),
                    y = Math.seededRandomInt(0, a.depth);
                1 == a.data[s][c][y].cat && a.data[s][c][y].dec > 0 && 4 == GameMap.numNeighbors6(a, s, c, y) && (a.data[s][c][y] = {})
            }
            for (var z = 0; z < a.width * a.depth * a.height / 60;) {
                var s = Math.seededRandomInt(1, a.width - 1),
                    c = Math.seededRandomInt(0, a.height - 1),
                    y = Math.seededRandomInt(1, a.depth - 1);
                a.data[s][c][y].cat || 0 != c && 1 != a.data[s][c - 1][y].cat || (1 != a.data[s][c][y + 1].cat || a.data[s][c + 1][y + 1].cat || a.data[s][c][y - 1].cat || 0 != c && 1 != a.data[s][c - 1][y - 1].cat ? 1 != a.data[s + 1][c][y].cat || a.data[s + 1][c + 1][y].cat || a.data[s - 1][c][y].cat || 0 != c && 1 != a.data[s - 1][c - 1][y].cat ? 1 != a.data[s][c][y - 1].cat || a.data[s][c + 1][y - 1].cat || a.data[s][c][y + 1].cat || 0 != c && 1 != a.data[s][c - 1][y + 1].cat ? 1 != a.data[s - 1][c][y].cat || a.data[s - 1][c + 1][y].cat || a.data[s + 1][c][y].cat || 0 != c && 1 != a.data[s + 1][c - 1][y].cat || (a.data[s][c][y] = {
                    cat: 2,
                    dec: 0,
                    dir: 3
                }, a.data[s][c + 1][y] = {}, a.data[s + 1][c + 1][y] = {}, z++) : (a.data[s][c][y] = {
                    cat: 2,
                    dec: 0,
                    dir: 2
                }, a.data[s][c + 1][y] = {}, a.data[s][c + 1][y + 1] = {}, z++) : (a.data[s][c][y] = {
                    cat: 2,
                    dec: 0,
                    dir: 1
                }, a.data[s][c + 1][y] = {}, a.data[s - 1][c + 1][y] = {}, z++) : (a.data[s][c][y] = {
                    cat: 2,
                    dec: 0,
                    dir: 0
                }, a.data[s][c + 1][y] = {}, a.data[s][c + 1][y - 1] = {}, z++))
            }
            for (u = 0; u < a.width * a.depth * a.height / 10; u++) {
                var s = Math.seededRandomInt(1, a.width - 1),
                    c = Math.seededRandomInt(0, a.height - 1),
                    y = Math.seededRandomInt(1, a.depth - 1);
                !a.data[s][c][y].cat && (0 == c || 1 == a.data[s][c - 1][y].cat) && GameMap.numNeighbors26(a, s, c, y) < 11 && (a.data[s][c][y] = {
                    cat: 4,
                    dec: 0,
                    dir: 0
                })
            }
            for (var u = 0; u < a.width * a.depth * a.height / 10; u++) {
                var s = Math.seededRandomInt(1, a.width - 1),
                    c = Math.seededRandomInt(0, a.height - 1),
                    y = Math.seededRandomInt(1, a.depth - 1);
                if (!a.data[s][c][y].cat && (0 == c || 1 == a.data[s][c - 1][y].cat && 4 == a.data[s][c - 1][y].dec) && GameMap.numNeighbors26(a, s, c, y) < 11) {
                    a.data[s][c][y] = {
                        cat: 1,
                        dec: Math.seededRandomInt(1, 4),
                        dir: Math.seededRandomInt(0, 4)
                    };
                    for (var m = 0; m < 20; m++) {
                        var l = s + Math.seededRandomInt(-1, 2),
                            p = y + Math.seededRandomInt(-1, 2);
                        if (4 == a.data[p][c][p].cat) break;
                        if (!a.data[p][c][p].cat && (0 == c || 1 == a.data[l][c - 1][p].cat && 4 == a.data[l][c - 1][p].dec)) {
                            a.data[l][c][p] = {
                                cat: 4,
                                dec: 0,
                                dir: 0
                            };
                            break
                        }
                    }
                }
            }
            for (s = 0; s < a.width; s++)
                for (y = 0; y < a.depth; y++)
                    for (c = 0; c < a.height - 1; c++) !a.data[s][c][y].cat && this.numNeighbors6(a, s, c, y) >= 4 && !a.data[s][c + 1][y].cat && (a.data[s][c][y] = {
                        cat: 1,
                        dec: this.firstNeighborDec(a, s, c, y),
                        dir: Math.seededRandomInt(0, 4)
                    });
            for (s = 0; s < a.width; s++)
                for (c = 0; c < a.height; c++)
                    for (y = 0; y < a.depth; y++) a.data[s][c][y].cat && 6 == GameMap.numNeighbors6(a, s, c, y) && (a.data[s][c][y].cat = 1, a.data[s][c][y].dec = 0);
            return GameMap.makeMinMap(a), a
        },
        firstNeighborDec: function (e, i, t, r) {
            for (var a = Math.max(1, i - 1); a <= Math.min(e.width - 2, i + 1); a++)
                for (var n = Math.max(0, t - 1); n <= Math.min(e.height - 1, t + 1); n++)
                    for (var o = Math.max(1, r - 1); o <= Math.min(e.depth - 2, r + 1); o++)
                        if ((i != a || t != n || r != o) && 1 == e.data[a][n][o].cat) return e.data[a][n][o].dec;
            return 0
        },
        numNeighbors6: function (e, i, t, r) {
            for (var a = 0, n = Math.max(1, i - 1); n <= Math.min(e.width - 2, i + 1); n++)
                for (var o = Math.max(0, t - 1); o <= Math.min(e.height - 1, t + 1); o++)
                    for (var d = Math.max(1, r - 1); d <= Math.min(e.depth - 2, r + 1); d++) Math.abs(n - i) + Math.abs(o - t) + Math.abs(d - r) == 1 && 1 == e.data[n][o][d].cat && a++;
            return 0 == t && a++, a
        },
        numNeighbors26: function (e, i, t, r) {
            for (var a = 0, n = Math.max(1, i - 1); n <= Math.min(e.width - 2, i + 1); n++)
                for (var o = Math.max(0, t - 1); o <= Math.min(e.height - 1, t + 1); o++)
                    for (var d = Math.max(1, r - 1); d <= Math.min(e.depth - 2, r + 1); d++) i == n && t == o && r == d || 1 == e.data[n][o][d].cat && a++;
            return 0 == t && (a += 9), a
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
                var a = players[r];
                if (a && (a.id == t.player.id || 0 == a.team || a.team != t.player.team)) {
                    var n = t.x - a.x,
                        o = t.y - (a.y + .3),
                        d = t.z - a.z,
                        s = Math.length3(n, o, d),
                        y = Math.max(0, t.damage - 25 * s);
                    if (a && !a.isDead() && y > 0) {
                        for (var l = Math.normalize3({
                                x: n,
                                y: o,
                                z: d
                            }, .25), h = a.x, x = a.y + .3, c = a.z, z = !0, u = 0; u < s; u += .25) {
                            if (collidesWithCell(h, x, c)) {
                                z = !1;
                                break
                            }
                            h += l.x, x += l.y, c += l.z
                        }
                        z && hitPlayer(a, t.player, y, -n, -d)
                    }
                }
            } else {
                var m = this.dx,
                    p = this.dy,
                    g = this.dz;
                this.dy -= .003 * e;
                var f = .5 * (this.dx + m) * e,
                    w = .5 * (this.dy + p) * e,
                    v = .5 * (this.dz + g) * e;
                this.dx *= Math.pow(.99, e), this.dz *= Math.pow(.99, e), this.x += f, this.collidesWithMap() && (this.x -= f, this.dx *= -.5, this.dy *= .8, this.dz *= .8), this.y += w, this.collidesWithMap() && (this.y -= w, this.dx *= .8, this.dy *= -.5, this.dz *= .8), this.z += v, this.collidesWithMap() && (this.z -= v, this.dx *= .8, this.dy *= .8, this.dz *= -.5), this.ttl -= e, this.actor && this.actor.update()
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
            t = .004 * (this.player.shotSpread + this.player.weapon.accuracy),
            r = BABYLON.Matrix.RotationYawPitchRoll((Math.random() - .5) * t, (Math.random() - .5) * t, (Math.random() - .5) * t),
            a = (i = i.multiply(r)).getTranslation();
        a.normalize();
        var n = BABYLON.Matrix.Translation(.1, .1, .4),
            o = (n = (n = n.multiply(e)).add(BABYLON.Matrix.Translation(this.player.x, this.player.y + .3, this.player.z))).getTranslation();
        this.fireMunitions(o, a)
    }
}, Gun.prototype.equip = function () {
    this.player.weaponIdx = this.player.equipWeaponIdx, this.player.weapon = this.player.weapons[this.player.weaponIdx], this.player.weapon.actor.equip(), this.player.id == meId && updateAmmoUi()
}, Eggk47.prototype = Object.create(Gun.prototype), Eggk47.prototype.constructor = Gun, Eggk47.prototype.fireMunitions = function (e, i) {
    munitionsManager.fireBullet(this.player, e, i, this.damage, this.ttl, this.velocity);
    var t = new Comm.output(14);
    t.packInt8(Comm.fireBullet), t.packInt8(this.player.id), t.packFloat(e.x), t.packFloat(e.y), t.packFloat(e.z), t.packFloat(i.x), t.packFloat(i.y), t.packFloat(i.z), sendToAll(t.buffer)
}, DozenGauge.prototype = Object.create(Gun.prototype), DozenGauge.prototype.constructor = Gun, DozenGauge.prototype.fireMunitions = function (e, i) {
    var t = Date.now() % 256;
    Math.seed = t;
    for (var r = 0; r < 20; r++) {
        var a = Math.normalize3({
            x: i.x + Math.seededRandom(-.15, .15),
            y: i.y + Math.seededRandom(-.1, .1),
            z: i.z + Math.seededRandom(-.15, .15)
        });
        munitionsManager.fireBullet(this.player, e, a, this.damage, this.ttl, this.velocity)
    }
    var n = new Comm.output(15);
    n.packInt8(Comm.fireShot), n.packInt8(this.player.id), n.packFloat(e.x), n.packFloat(e.y), n.packFloat(e.z), n.packFloat(i.x), n.packFloat(i.y), n.packFloat(i.z), n.packInt8(t), sendToAll(n.buffer)
}, CSG1.prototype = Object.create(Gun.prototype), CSG1.prototype.constructor = Gun, CSG1.prototype.fireMunitions = function (e, i) {
    munitionsManager.fireBullet(this.player, e, i, this.damage, this.ttl, this.velocity);
    var t = new Comm.output(14);
    t.packInt8(Comm.fireBullet), t.packInt8(this.player.id), t.packFloat(e.x), t.packFloat(e.y), t.packFloat(e.z), t.packFloat(i.x), t.packFloat(i.y), t.packFloat(i.z), sendToAll(t.buffer)
}, Cluck9mm.prototype = Object.create(Gun.prototype), Cluck9mm.prototype.constructor = Gun, Cluck9mm.prototype.fireMunitions = function (e, i) {
    munitionsManager.fireBullet(this.player, e, i, this.damage, this.ttl, this.velocity);
    var t = new Comm.output(14);
    t.packInt8(Comm.fireBullet), t.packInt8(this.player.id), t.packFloat(e.x), t.packFloat(e.y), t.packFloat(e.z), t.packFloat(i.x), t.packFloat(i.y), t.packFloat(i.z), sendToAll(t.buffer)
}, Math.PI2 = 2 * Math.PI, Math.PI90 = Math.PI / 2, Math.mod = function (e, i) {
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
            1: [{
                x: 2,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 2,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 2,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 2,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 3,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 3,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 5,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 7,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 9,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 10,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 12,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 18,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 1,
                dir: 2
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
                z: 14,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 2,
                dir: 2
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
                z: 14,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 23,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 23,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 23,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 23,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 23,
                y: 0,
                z: 14,
                dir: 2
            }],
            2: [{
                x: 0,
                y: 0,
                z: 0,
                dir: 1
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
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 0,
                y: 0,
                z: 7,
                dir: 2
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
                dir: 2
            }, {
                x: 0,
                y: 0,
                z: 12,
                dir: 2
            }, {
                x: 0,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 14,
                dir: 3
            }, {
                x: 0,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 1,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 12,
                dir: 3
            }, {
                x: 1,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 1,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 1,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 2,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 2,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 2,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 2,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 2,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 2,
                y: 0,
                z: 12,
                dir: 3
            }, {
                x: 2,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 2,
                y: 0,
                z: 15,
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
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 3,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 3,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 3,
                y: 0,
                z: 13,
                dir: 2
            }, {
                x: 3,
                y: 0,
                z: 14,
                dir: 3
            }, {
                x: 3,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 4,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 4,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 4,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 4,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 4,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 4,
                y: 0,
                z: 11,
                dir: 2
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
                z: 14,
                dir: 1
            }, {
                x: 4,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 5,
                y: 0,
                z: 1,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 5,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 5,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 5,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 5,
                y: 0,
                z: 11,
                dir: 2
            }, {
                x: 5,
                y: 0,
                z: 12,
                dir: 3
            }, {
                x: 5,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 5,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 6,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 1,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 2,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 6,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 6,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 6,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 6,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 6,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 6,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 6,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 2,
                dir: 3
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
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 7,
                y: 0,
                z: 7,
                dir: 3
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
                z: 10,
                dir: 2
            }, {
                x: 7,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 7,
                y: 0,
                z: 12,
                dir: 2
            }, {
                x: 7,
                y: 0,
                z: 13,
                dir: 2
            }, {
                x: 7,
                y: 0,
                z: 15,
                dir: 2
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
                dir: 1
            }, {
                x: 8,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 5,
                dir: 0
            }, {
                x: 8,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 8,
                y: 0,
                z: 7,
                dir: 3
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
                dir: 2
            }, {
                x: 8,
                y: 0,
                z: 15,
                dir: 2
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
                dir: 3
            }, {
                x: 9,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 9,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 9,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 9,
                y: 0,
                z: 12,
                dir: 2
            }, {
                x: 9,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 9,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 0,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 1,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 3,
                dir: 1
            }, {
                x: 10,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 10,
                y: 0,
                z: 5,
                dir: 0
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
                dir: 2
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
                dir: 3
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
                z: 15,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 11,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 4,
                dir: 2
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
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 11,
                y: 0,
                z: 9,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 11,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 11,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 12,
                y: 0,
                z: 1,
                dir: 3
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
                z: 4,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 12,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 12,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 12,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 12,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 12,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 0,
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 1,
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
                dir: 0
            }, {
                x: 13,
                y: 0,
                z: 4,
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
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 13,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 13,
                y: 0,
                z: 10,
                dir: 1
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
                dir: 2
            }, {
                x: 13,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 13,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 14,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 3,
                dir: 0
            }, {
                x: 14,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 14,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 7,
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
                dir: 2
            }, {
                x: 14,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 14,
                y: 0,
                z: 11,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 12,
                dir: 2
            }, {
                x: 14,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 14,
                y: 0,
                z: 14,
                dir: 2
            }, {
                x: 14,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 0,
                dir: 2
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
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 4,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 8,
                dir: 1
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
                z: 11,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 12,
                dir: 3
            }, {
                x: 15,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 15,
                y: 0,
                z: 14,
                dir: 1
            }, {
                x: 15,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 16,
                y: 0,
                z: 0,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 2,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 3,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 16,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 16,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 16,
                y: 0,
                z: 8,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 9,
                dir: 1
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
                z: 12,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 16,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 17,
                y: 0,
                z: 0,
                dir: 1
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
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 4,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 5,
                dir: 1
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
                z: 8,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 10,
                dir: 2
            }, {
                x: 17,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 17,
                y: 0,
                z: 12,
                dir: 3
            }, {
                x: 17,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 17,
                y: 0,
                z: 15,
                dir: 2
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
                dir: 0
            }, {
                x: 18,
                y: 0,
                z: 3,
                dir: 3
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
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 18,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 18,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 18,
                y: 0,
                z: 11,
                dir: 2
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
                z: 15,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 0,
                dir: 2
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
                dir: 2
            }, {
                x: 19,
                y: 0,
                z: 8,
                dir: 1
            }, {
                x: 19,
                y: 0,
                z: 9,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 19,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 19,
                y: 0,
                z: 12,
                dir: 1
            }, {
                x: 19,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 19,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 20,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 20,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 20,
                y: 0,
                z: 7,
                dir: 1
            }, {
                x: 20,
                y: 0,
                z: 8,
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
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 12,
                dir: 2
            }, {
                x: 20,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 20,
                y: 0,
                z: 15,
                dir: 1
            }, {
                x: 21,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 6,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 21,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 9,
                dir: 1
            }, {
                x: 21,
                y: 0,
                z: 10,
                dir: 0
            }, {
                x: 21,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 21,
                y: 0,
                z: 12,
                dir: 2
            }, {
                x: 21,
                y: 0,
                z: 13,
                dir: 3
            }, {
                x: 21,
                y: 0,
                z: 15,
                dir: 3
            }, {
                x: 22,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 5,
                dir: 1
            }, {
                x: 22,
                y: 0,
                z: 6,
                dir: 0
            }, {
                x: 22,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 22,
                y: 0,
                z: 8,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 10,
                dir: 1
            }, {
                x: 22,
                y: 0,
                z: 11,
                dir: 1
            }, {
                x: 22,
                y: 0,
                z: 12,
                dir: 3
            }, {
                x: 22,
                y: 0,
                z: 13,
                dir: 2
            }, {
                x: 22,
                y: 0,
                z: 15,
                dir: 0
            }, {
                x: 23,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 23,
                y: 0,
                z: 5,
                dir: 2
            }, {
                x: 23,
                y: 0,
                z: 6,
                dir: 3
            }, {
                x: 23,
                y: 0,
                z: 7,
                dir: 2
            }, {
                x: 23,
                y: 0,
                z: 8,
                dir: 2
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
                dir: 1
            }, {
                x: 23,
                y: 0,
                z: 12,
                dir: 3
            }, {
                x: 23,
                y: 0,
                z: 13,
                dir: 1
            }, {
                x: 23,
                y: 0,
                z: 15,
                dir: 2
            }, {
                x: 24,
                y: 0,
                z: 0,
                dir: 2
            }, {
                x: 24,
                y: 0,
                z: 1,
                dir: 0
            }, {
                x: 24,
                y: 0,
                z: 2,
                dir: 3
            }, {
                x: 24,
                y: 0,
                z: 3,
                dir: 3
            }, {
                x: 24,
                y: 0,
                z: 4,
                dir: 3
            }, {
                x: 24,
                y: 0,
                z: 5,
                dir: 3
            }, {
                x: 24,
                y: 0,
                z: 6,
                dir: 1
            }, {
                x: 24,
                y: 0,
                z: 7,
                dir: 3
            }, {
                x: 24,
                y: 0,
                z: 8,
                dir: 0
            }, {
                x: 24,
                y: 0,
                z: 9,
                dir: 2
            }, {
                x: 24,
                y: 0,
                z: 10,
                dir: 3
            }, {
                x: 24,
                y: 0,
                z: 11,
                dir: 0
            }, {
                x: 24,
                y: 0,
                z: 12,
                dir: 0
            }, {
                x: 24,
                y: 0,
                z: 13,
                dir: 0
            }, {
                x: 24,
                y: 0,
                z: 14,
                dir: 0
            }, {
                x: 24,
                y: 0,
                z: 15,
                dir: 0
            }]
        },
        2: {
            3: [{
                x: 0,
                y: 1,
                z: 0,
                dir: 2
            }, {
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
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 0,
                y: 1,
                z: 5,
                dir: 1
            }, {
                x: 0,
                y: 1,
                z: 6,
                dir: 3
            }, {
                x: 0,
                y: 1,
                z: 7,
                dir: 3
            }, {
                x: 0,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 0,
                y: 1,
                z: 9,
                dir: 1
            }, {
                x: 0,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 0,
                y: 1,
                z: 11,
                dir: 1
            }, {
                x: 0,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 1,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 1,
                y: 1,
                z: 6,
                dir: 2
            }, {
                x: 1,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 2,
                y: 1,
                z: 6,
                dir: 1
            }, {
                x: 2,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 6,
                dir: 1
            }, {
                x: 3,
                y: 1,
                z: 12,
                dir: 3
            }, {
                x: 4,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 1,
                dir: 3
            }, {
                x: 4,
                y: 1,
                z: 3,
                dir: 3
            }, {
                x: 4,
                y: 1,
                z: 4,
                dir: 1
            }, {
                x: 4,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 4,
                y: 1,
                z: 12,
                dir: 2
            }, {
                x: 5,
                y: 1,
                z: 0,
                dir: 2
            }, {
                x: 5,
                y: 1,
                z: 3,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 4,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 5,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 6,
                dir: 3
            }, {
                x: 5,
                y: 1,
                z: 8,
                dir: 3
            }, {
                x: 5,
                y: 1,
                z: 10,
                dir: 0
            }, {
                x: 5,
                y: 1,
                z: 11,
                dir: 3
            }, {
                x: 5,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 5,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 5,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 5,
                y: 2,
                z: 7,
                dir: 2
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
                dir: 3
            }, {
                x: 5,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 6,
                y: 1,
                z: 0,
                dir: 1
            }, {
                x: 6,
                y: 1,
                z: 3,
                dir: 0
            }, {
                x: 6,
                y: 1,
                z: 11,
                dir: 2
            }, {
                x: 6,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 3,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 4,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 6,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 6,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 7,
                y: 1,
                z: 0,
                dir: 2
            }, {
                x: 7,
                y: 1,
                z: 11,
                dir: 3
            }, {
                x: 7,
                y: 1,
                z: 12,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 3,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 4,
                dir: 2
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
                dir: 2
            }, {
                x: 7,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 10,
                dir: 3
            }, {
                x: 7,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 7,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 7,
                y: 3,
                z: 4,
                dir: 2
            }, {
                x: 7,
                y: 3,
                z: 5,
                dir: 1
            }, {
                x: 7,
                y: 3,
                z: 7,
                dir: 3
            }, {
                x: 7,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 7,
                y: 3,
                z: 9,
                dir: 0
            }, {
                x: 8,
                y: 1,
                z: 0,
                dir: 0
            }, {
                x: 8,
                y: 1,
                z: 3,
                dir: 3
            }, {
                x: 8,
                y: 1,
                z: 4,
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
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 8,
                y: 2,
                z: 9,
                dir: 1
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
                dir: 2
            }, {
                x: 8,
                y: 3,
                z: 4,
                dir: 2
            }, {
                x: 8,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 8,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 8,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 8,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 8,
                y: 3,
                z: 9,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 0,
                dir: 3
            }, {
                x: 9,
                y: 1,
                z: 1,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 2,
                dir: 3
            }, {
                x: 9,
                y: 1,
                z: 3,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 9,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 11,
                dir: 2
            }, {
                x: 9,
                y: 1,
                z: 12,
                dir: 3
            }, {
                x: 9,
                y: 2,
                z: 2,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 3,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 4,
                dir: 3
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
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 8,
                dir: 1
            }, {
                x: 9,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 9,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 9,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 9,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 9,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 9,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 9,
                y: 3,
                z: 8,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 2,
                dir: 1
            }, {
                x: 10,
                y: 1,
                z: 3,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 10,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 10,
                y: 1,
                z: 9,
                dir: 3
            }, {
                x: 10,
                y: 1,
                z: 10,
                dir: 3
            }, {
                x: 10,
                y: 1,
                z: 11,
                dir: 1
            }, {
                x: 10,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 10,
                y: 1,
                z: 13,
                dir: 1
            }, {
                x: 10,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 10,
                y: 1,
                z: 15,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 2,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 4,
                dir: 0
            }, {
                x: 10,
                y: 2,
                z: 5,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 6,
                dir: 2
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
                dir: 1
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
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 13,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 14,
                dir: 1
            }, {
                x: 10,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 10,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 10,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 10,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 10,
                y: 3,
                z: 8,
                dir: 0
            }, {
                x: 10,
                y: 3,
                z: 9,
                dir: 0
            }, {
                x: 10,
                y: 4,
                z: 7,
                dir: 0
            }, {
                x: 10,
                y: 4,
                z: 8,
                dir: 0
            }, {
                x: 10,
                y: 4,
                z: 9,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 3,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 4,
                dir: 1
            }, {
                x: 11,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 8,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 9,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 10,
                dir: 2
            }, {
                x: 11,
                y: 1,
                z: 11,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 5,
                dir: 3
            }, {
                x: 11,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 11,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 11,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 11,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 11,
                y: 3,
                z: 4,
                dir: 2
            }, {
                x: 11,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 11,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 11,
                y: 3,
                z: 9,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 3,
                dir: 2
            }, {
                x: 12,
                y: 1,
                z: 4,
                dir: 3
            }, {
                x: 12,
                y: 1,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 7,
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
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 12,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 12,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 12,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 12,
                y: 3,
                z: 4,
                dir: 3
            }, {
                x: 12,
                y: 3,
                z: 5,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 6,
                dir: 2
            }, {
                x: 12,
                y: 3,
                z: 7,
                dir: 1
            }, {
                x: 12,
                y: 3,
                z: 8,
                dir: 0
            }, {
                x: 12,
                y: 3,
                z: 9,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 3,
                dir: 3
            }, {
                x: 13,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 13,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 6,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 7,
                dir: 2
            }, {
                x: 13,
                y: 2,
                z: 9,
                dir: 3
            }, {
                x: 13,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 13,
                y: 2,
                z: 12,
                dir: 3
            }, {
                x: 13,
                y: 3,
                z: 4,
                dir: 1
            }, {
                x: 13,
                y: 3,
                z: 5,
                dir: 1
            }, {
                x: 13,
                y: 3,
                z: 6,
                dir: 0
            }, {
                x: 13,
                y: 3,
                z: 7,
                dir: 0
            }, {
                x: 13,
                y: 3,
                z: 8,
                dir: 0
            }, {
                x: 13,
                y: 3,
                z: 9,
                dir: 0
            }, {
                x: 13,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 14,
                y: 1,
                z: 3,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 14,
                y: 1,
                z: 12,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 14,
                y: 2,
                z: 5,
                dir: 1
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
                dir: 3
            }, {
                x: 14,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 14,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 15,
                y: 1,
                z: 3,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 4,
                dir: 0
            }, {
                x: 15,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 15,
                y: 1,
                z: 6,
                dir: 1
            }, {
                x: 15,
                y: 1,
                z: 7,
                dir: 3
            }, {
                x: 15,
                y: 1,
                z: 8,
                dir: 1
            }, {
                x: 15,
                y: 1,
                z: 9,
                dir: 1
            }, {
                x: 15,
                y: 1,
                z: 12,
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 4,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 15,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 15,
                y: 2,
                z: 7,
                dir: 0
            }, {
                x: 15,
                y: 2,
                z: 8,
                dir: 1
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
                dir: 3
            }, {
                x: 15,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 9,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 10,
                dir: 0
            }, {
                x: 16,
                y: 1,
                z: 3,
                dir: 1
            }, {
                x: 16,
                y: 1,
                z: 4,
                dir: 2
            }, {
                x: 16,
                y: 1,
                z: 5,
                dir: 2
            }, {
                x: 16,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 16,
                y: 1,
                z: 7,
                dir: 3
            }, {
                x: 16,
                y: 1,
                z: 9,
                dir: 1
            }, {
                x: 16,
                y: 1,
                z: 12,
                dir: 2
            }, {
                x: 16,
                y: 2,
                z: 9,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 11,
                dir: 0
            }, {
                x: 16,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 16,
                y: 3,
                z: 9,
                dir: 0
            }, {
                x: 16,
                y: 3,
                z: 10,
                dir: 0
            }, {
                x: 17,
                y: 1,
                z: 7,
                dir: 2
            }, {
                x: 17,
                y: 1,
                z: 12,
                dir: 3
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
                x: 18,
                y: 1,
                z: 7,
                dir: 3
            }, {
                x: 18,
                y: 1,
                z: 12,
                dir: 2
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
                x: 19,
                y: 1,
                z: 7,
                dir: 1
            }, {
                x: 19,
                y: 1,
                z: 12,
                dir: 2
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
                x: 20,
                y: 1,
                z: 2,
                dir: 2
            }, {
                x: 20,
                y: 1,
                z: 3,
                dir: 2
            }, {
                x: 20,
                y: 1,
                z: 6,
                dir: 0
            }, {
                x: 20,
                y: 1,
                z: 7,
                dir: 0
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
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 6,
                dir: 3
            }, {
                x: 20,
                y: 2,
                z: 7,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 8,
                dir: 2
            }, {
                x: 20,
                y: 2,
                z: 9,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 10,
                dir: 0
            }, {
                x: 20,
                y: 2,
                z: 11,
                dir: 1
            }, {
                x: 20,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 21,
                y: 1,
                z: 2,
                dir: 2
            }, {
                x: 21,
                y: 1,
                z: 3,
                dir: 2
            }, {
                x: 21,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 21,
                y: 2,
                z: 8,
                dir: 0
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
                dir: 0
            }, {
                x: 21,
                y: 2,
                z: 12,
                dir: 0
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
                z: 10,
                dir: 3
            }, {
                x: 22,
                y: 1,
                z: 11,
                dir: 3
            }, {
                x: 22,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 6,
                dir: 2
            }, {
                x: 22,
                y: 2,
                z: 7,
                dir: 3
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
                x: 23,
                y: 1,
                z: 6,
                dir: 3
            }, {
                x: 23,
                y: 1,
                z: 7,
                dir: 2
            }, {
                x: 23,
                y: 1,
                z: 9,
                dir: 2
            }, {
                x: 23,
                y: 1,
                z: 10,
                dir: 2
            }, {
                x: 23,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 23,
                y: 1,
                z: 12,
                dir: 0
            }, {
                x: 23,
                y: 2,
                z: 6,
                dir: 0
            }, {
                x: 23,
                y: 2,
                z: 7,
                dir: 3
            }, {
                x: 23,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 23,
                y: 2,
                z: 9,
                dir: 2
            }, {
                x: 23,
                y: 2,
                z: 10,
                dir: 1
            }, {
                x: 23,
                y: 2,
                z: 11,
                dir: 3
            }, {
                x: 23,
                y: 2,
                z: 12,
                dir: 0
            }, {
                x: 24,
                y: 1,
                z: 10,
                dir: 2
            }, {
                x: 24,
                y: 1,
                z: 11,
                dir: 2
            }, {
                x: 24,
                y: 1,
                z: 12,
                dir: 2
            }, {
                x: 24,
                y: 2,
                z: 10,
                dir: 2
            }, {
                x: 24,
                y: 2,
                z: 11,
                dir: 2
            }, {
                x: 24,
                y: 2,
                z: 12,
                dir: 2
            }]
        },
        4: {
            0: [{
                x: 5,
                y: 3,
                z: 3,
                dir: 1
            }, {
                x: 6,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 6,
                y: 2,
                z: 12,
                dir: 1
            }, {
                x: 7,
                y: 4,
                z: 9,
                dir: 1
            }, {
                x: 9,
                y: 1,
                z: 15,
                dir: 1
            }, {
                x: 10,
                y: 2,
                z: 15,
                dir: 1
            }, {
                x: 10,
                y: 4,
                z: 6,
                dir: 1
            }, {
                x: 11,
                y: 1,
                z: 15,
                dir: 1
            }, {
                x: 12,
                y: 4,
                z: 4,
                dir: 1
            }, {
                x: 13,
                y: 4,
                z: 5,
                dir: 1
            }, {
                x: 15,
                y: 3,
                z: 4,
                dir: 0
            }, {
                x: 15,
                y: 3,
                z: 8,
                dir: 0
            }, {
                x: 16,
                y: 1,
                z: 14,
                dir: 1
            }, {
                x: 17,
                y: 3,
                z: 10,
                dir: 2
            }, {
                x: 18,
                y: 1,
                z: 13,
                dir: 1
            }, {
                x: 20,
                y: 1,
                z: 14,
                dir: 1
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
                x: 21,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 21,
                y: 3,
                z: 9,
                dir: 2
            }, {
                x: 21,
                y: 3,
                z: 10,
                dir: 2
            }, {
                x: 23,
                y: 3,
                z: 8,
                dir: 2
            }, {
                x: 23,
                y: 3,
                z: 9,
                dir: 2
            }, {
                x: 23,
                y: 3,
                z: 10,
                dir: 2
            }]
        },
        5: {
            0: [{
                x: 1,
                y: 1,
                z: 1,
                dir: 2
            }, {
                x: 2,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 2,
                y: 1,
                z: 13,
                dir: 2
            }, {
                x: 3,
                y: 1,
                z: 11,
                dir: 0
            }, {
                x: 3,
                y: 1,
                z: 13,
                dir: 2
            }, {
                x: 4,
                y: 1,
                z: 5,
                dir: 1
            }, {
                x: 5,
                y: 1,
                z: 1,
                dir: 2
            }, {
                x: 5,
                y: 2,
                z: 5,
                dir: 1
            }, {
                x: 7,
                y: 3,
                z: 6,
                dir: 1
            }, {
                x: 9,
                y: 3,
                z: 4,
                dir: 0
            }, {
                x: 9,
                y: 3,
                z: 9,
                dir: 2
            }, {
                x: 10,
                y: 2,
                z: 3,
                dir: 3
            }, {
                x: 11,
                y: 1,
                z: 2,
                dir: 0
            }, {
                x: 11,
                y: 1,
                z: 7,
                dir: 0
            }, {
                x: 12,
                y: 1,
                z: 8,
                dir: 3
            }, {
                x: 14,
                y: 1,
                z: 13,
                dir: 2
            }, {
                x: 14,
                y: 2,
                z: 12,
                dir: 2
            }, {
                x: 17,
                y: 1,
                z: 5,
                dir: 3
            }, {
                x: 18,
                y: 1,
                z: 8,
                dir: 2
            }, {
                x: 22,
                y: 1,
                z: 9,
                dir: 0
            }, {
                x: 22,
                y: 2,
                z: 10,
                dir: 0
            }]
        },
        6: {
            0: [{
                x: 11,
                y: 2,
                z: 8,
                dir: 3
            }, {
                x: 11,
                y: 3,
                z: 8,
                dir: 3
            }, {
                x: 11,
                y: 4,
                z: 8,
                dir: 3
            }, {
                x: 23,
                y: 1,
                z: 2,
                dir: 3
            }]
        }
    },
    width: 25,
    height: 5,
    depth: 16,
    name: "",
    surfaceArea: 429
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
}];
MunitionsManager.prototype.update = function (e) {
    for (var i = 0; i < 4; i++) this.bulletPool.forEachActive(function (i) {
        i.update(.25 * e);
        for (var t = 0; t < 20; t++) {
            var r = players[t];
            if (r && !r.isDead() && r.id != i.player.id && (0 == r.team || r.team != i.player.team) && Math.abs(i.x - r.x) < .3 && Math.abs(i.y - (r.y + .3)) < .3 && Math.abs(i.z - r.z) < .3) {
                var a = i.player;
                v1.x = i.dx, v1.y = i.dy, v1.z = i.dz, v2.x = r.x - i.x, v2.y = r.y + .32 - i.y, v2.z = r.z - i.z;
                var n = BABYLON.Vector3.Cross(v1, v2);
                hitPlayer(r, a, i.damage / (1 + 20 * n.length()), v1.x, v1.z), i.remove()
            }
        }
    });
    this.grenadePool.forEachActive(function (i) {
        i.update(e)
    })
}, MunitionsManager.prototype.fireBullet = function (e, i, t, r, a, n) {
    this.bulletPool.retrieve().fire(e, i, t, r, a, n)
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
        a = 0;
    if (this.controlKeys & CONTROL.left && (t -= Math.cos(this.moveYaw), a += Math.sin(this.moveYaw)), this.controlKeys & CONTROL.right && (t += Math.cos(this.moveYaw), a -= Math.sin(this.moveYaw)), this.controlKeys & CONTROL.up && (this.climbing ? r += 1 : (t += Math.sin(this.moveYaw), a += Math.cos(this.moveYaw))), this.controlKeys & CONTROL.down && (this.climbing ? r -= 1 : (t -= Math.sin(this.moveYaw), a -= Math.cos(this.moveYaw))), this.climbing) {
        this.jumping = !1;
        d = this.dy;
        this.dy += .014 * r * e;
        l = .5 * (this.dy + d) * e;
        this.y += l, this.dy *= Math.pow(.5, e), this.getOccupiedCell().cat != MAP.ladder && (this.y = Math.round(this.y), this.climbing = !1), this.collidesWithMap() && l > 0 && this.y % 1 > .3 && (this.y -= l, this.dy *= .5)
    } else {
        var n = new BABYLON.Vector3(t, r, a).normalize();
        this.actor || (this.clientCorrection = Math.capVector2(this.clientCorrection, .1));
        var o = this.dx + this.clientCorrection.x,
            d = this.dy,
            s = this.dz + this.clientCorrection.y;
        this.clientCorrection.x = 0, this.clientCorrection.y = 0, this.dx += .007 * n.x * e, this.dz += .007 * n.z * e, this.dy -= .003 * e, this.dy = Math.max(-.2, this.dy);
        var y = .5 * (this.dx + o) * e,
            l = .5 * (this.dy + d) * e,
            h = .5 * (this.dz + s) * e;
        this.moveX(y, e), this.moveZ(h, e), this.moveY(l, e)
    }
    if (!i) {
        var x = Math.length3(this.dx, this.dy, this.dz);
        this.actor && this.id == meId && (x *= .75), (this.climbing || this.jumping) && (x *= 2), this.bobble = (this.bobble + 7 * x) % Math.PI2, this.shotSpread += Math.floor(150 * x * e);
        var c = Math.pow(this.weapon.accuracySettleFactor, e);
        this.shotSpread = Math.max(this.shotSpread * c - 4 * (1 - c), 0), this.weapon && this.weapon.update(e), this.hp > 0 && (this.hp = Math.min(100, this.hp + .05 * e)), this.swapWeaponCountdown > 0 && (this.shotSpread = this.weapon.shotSpreadIncrement, this.swapWeaponCountdown -= e, !this.actor && this.swapWeaponCountdown <= 0 && (this.swapWeaponCountdown = 0, this.weaponIdx = this.equipWeaponIdx, this.weapon = this.weapons[this.weaponIdx])), this.reloadCountdown > 0 && (this.shotSpread = this.weapon.shotSpreadIncrement, this.reloadCountdown -= e, this.reloadCountdown <= 0 && (this.reloadCountdown = 0, this.reloaded())), this.rofCountdown > 0 && (this.rofCountdown = Math.max(this.rofCountdown - e, 0)), this.recoilCountdown > 0 && (this.recoilCountdown = Math.max(this.recoilCountdown - e, 0)), this.teamSwitchCooldown > 0 && (this.teamSwitchCooldown = Math.max(this.teamSwitchCooldown - e, 0), this.actor && this.id == meId && 0 == this.teamSwitchCooldown && (document.getElementById("switchTeamButton").style.opacity = 1, document.getElementById("switchTeamButton").style.pointerEvents = "all")), this.grenadeCountdown > 0 && (this.grenadeCountdown -= e, this.grenadeCountdown <= 0 && this.grenadesQueued > 0 && !this.actor && this.throwGrenade()), this.chatLineCap = Math.min(this.chatLineCap + e / 120, 2), this.triggerPulled && this.fire()
    }
    this.dx *= Math.pow(.8, e), this.dz *= Math.pow(.8, e), this.actor || (this.shotsQueued > 0 && this.fire(), this.reloadsQueued > 0 && this.reload(), this.weaponSwapsQueued > 0 && this.swapWeapon(this.equipWeaponIdx))
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
    if (this.isAtReady() && this.rofCountdown <= 0)
        if (this.weapon.ammo.rounds > 0)
            if (this.weapon.fire(), this.weapon.ammo.rounds--, this.recoilCountdown = this.weapon.rof / 3, this.rofCountdown = this.weapon.rof, this.shotSpread += this.weapon.shotSpreadIncrement, 0 == this.weapon.automatic && (this.triggerPulled = !1), this.actor) {
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
    if (this.actor) {
        var e = new Comm.output(3);
        e.packInt8(Comm.throwGrenade), e.packFloat(Math.clamp(grenadeThrowPower, 0, 1)), ws.send(e.buffer), me.grenadeCountdown = 60, this.actor.reachForGrenade()
    } else if (this.isAtReady() && this.grenadeCount > 0) {
        this.grenadeCount--, this.grenadesQueued--, this.grenadeCountdown = 54;
        var i = BABYLON.Matrix.RotationYawPitchRoll(this.viewYaw, this.pitch, 0),
            t = BABYLON.Matrix.Translation(0, .1, 1).multiply(i).getTranslation(),
            r = BABYLON.Matrix.Translation(.1, -.05, .2),
            a = (r = (r = r.multiply(i)).add(BABYLON.Matrix.Translation(this.x, this.y + .3, this.z))).getTranslation(),
            n = .1 * this.grenadeThrowPower + .1;
        t.x *= n, t.y *= n, t.z *= n, (e = new Comm.output(14)).packInt8(Comm.throwGrenade), e.packInt8(this.id), e.packFloat(a.x), e.packFloat(a.y), e.packFloat(a.z), e.packFloat(t.x), e.packFloat(t.y), e.packFloat(t.z), sendToAll(e.buffer), munitionsManager.throwGrenade(this, a, t)
    }
}, Player.prototype.die = function () {
    this.hp = 0, this.killStreak = 0, this.controlKeys = 0, this.shotSpread = 0, this.jumping = !1, this.climbing = !1, this.resetWeaponState(), this.actor && (this.actor.die(), this.id == meId && (grenadePowerUp = !1))
}, Player.prototype.respawn = function (e, i, t, r) {
    this.x = e, this.y = i, this.z = t, this.hp = 100, this.resetWeaponState(r), this.actor && (this.resetStateBuffer(), this.actor.mesh.position.x = e, this.actor.mesh.position.y = i, this.actor.mesh.position.z = t, this.actor.respawn(), this.weapon.equip(), this.id == meId && updateAmmoUi())
}, Player.prototype.resetWeaponState = function (e) {
    if (this.rofCountdown = 0, this.triggerPulled = !1, this.shotsQueued = 0, this.reloadsQueued = 0, this.recoilCountdown = 0, this.reloadCountdown = 0, this.swapWeaponCountdown = 0, this.weaponSwapsQueued = 0, this.shotSpread = 0, this.weaponIdx = 1, this.grenadeCountdown = 0, this.grenadesQueued = 0, !e) {
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
    for (var r, a, n, o, d, s, y, l, h, x = .25; x <= .75; x += .25)
        for (var c = 0; c <= .6; c += .3)
            for (var z = .25; z <= .75; z += .25)
                if (r = e + x, a = i + c, n = t + z, o = Math.floor(r), d = Math.floor(a), s = Math.floor(n), o >= 0 && d >= 0 && s >= 0 && o < map.width && d < map.height && s < map.depth) {
                    var u = map.data[o][d][s];
                    if (u.cat == MAP.ground || u.cat == MAP.block) return u;
                    if (u.cat == MAP.ramp) switch (y = r % 1, l = a % 1, h = n % 1, u.dir) {
                        case 0:
                            if (l < h) return u;
                            break;
                        case 2:
                            if (l < 1 - h) return u;
                            break;
                        case 1:
                            if (l < y) return u;
                            break;
                        case 3:
                            if (l < 1 - y) return u
                    } else if (u.cat == MAP.halfBlock) {
                        if (y = r % 1, l = a % 1, h = n % 1, y < .7 && y > .3 && h < .7 && h > .3 && l < .5) return u
                    } else if (u.cat == MAP.column) {
                        if (y = r % 1 - .5, h = n % 1 - .5, y * y + h * h < .04) return u
                    } else if (u.cat == MAP.tank) {
                        if (y = r % 1 - .5, l = a % 1 - .5, h = n % 1 - .5, l < .2) return u;
                        if (0 == u.dir || 2 == u.dir) {
                            if (y * y + l * l < .25) return u
                        } else if (h * h + l * l < .25) return u
                    } else if (u.cat == MAP.lowWall && (y = r % 1, l = a % 1, h = n % 1, l < .25)) switch (u.dir) {
                        case 0:
                            if (h > .75) return u;
                            break;
                        case 1:
                            if (y > .75) return u;
                            break;
                        case 2:
                            if (h < .25) return u;
                            break;
                        case 3:
                            if (y < .25) return u
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