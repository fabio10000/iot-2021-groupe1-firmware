function h(b) {
    b = E.toString(b);
    var a = "",
        d;
    for (d in b) a += (b.charCodeAt(d) + 256).toString(16).substr(-2);
    return a
}

function k(b, a) {
    for (var d = ""; a < b.length; a += 2) d += String.fromCharCode(parseInt(b.substr(a, 2), 16));
    return d
}

function g(b, a) {
    this.ser = b;
    this.options = a || {};
    this.at = require("AT").connect(b);
    this.options.debug && this.at.debug();
    var d = this;
    this.at.registerLine("mac_rx 1", function(c) {
        d.emit("message", k(c, 9))
    });
    this.macOn = !0
}
g.prototype.reset = function(b) {
    this.options.reset ? (this.options.reset.reset(),
        this.options.reset.set()) : this.at.cmd("sys reset\r\n", 1E3, b);
    b && b()
};
g.prototype.getVersion = function(b) {
    this.at.cmd("sys get ver\r\n", 1E3, function(a) {
        a ? (a = a.split(" "), b({
            type: a[0],
            version: a[1],
            date: a.slice(2).join(" ")
        })) : b()
    })
};
g.prototype.getStatus = function(b) {
    var a = {},
        d = this.at;
    (new Promise(function(c) {
        d.cmd("sys get hweui\r\n", 500, c)
    })).then(function(c) {
        a.EUI = c;
        return new Promise(function(e) {
            d.cmd("sys get vdd\r\n", 500, e)
        })
    }).then(function(c) {
        a.VDD = parseInt(c, 10) / 1E3;
        return new Promise(function(e) {
            d.cmd("mac get appeui\r\n",
                500, e)
        })
    }).then(function(c) {
        a.appEUI = c;
        return new Promise(function(e) {
            d.cmd("mac get deveui\r\n", 500, e)
        })
    }).then(function(c) {
        a.devEUI = c;
        return new Promise(function(e) {
            d.cmd("mac get band\r\n", 500, e)
        })
    }).then(function(c) {
        a.band = c;
        return new Promise(function(e) {
            d.cmd("mac get dr\r\n", 500, e)
        })
    }).then(function(c) {
        a.dataRate = c;
        return new Promise(function(e) {
            d.cmd("mac get rxdelay1\r\n", 500, e)
        })
    }).then(function(c) {
        a.rxDelay1 = c;
        return new Promise(function(e) {
            d.cmd("mac get rxdelay2\r\n", 500, e)
        })
    }).then(function(c) {
        a.rxDelay2 =
            c;
        return new Promise(function(e) {
            d.cmd("mac get rx2 868\r\n", 500, e)
        })
    }).then(function(c) {
        a.rxFreq2_868 = c;
        b(a)
    })
};
g.prototype.LoRaWAN = function(b, a, d, c) {
    var e = this.at;
    (new Promise(function(f) {
        e.cmd("mac set devaddr " + b + "\r\n", 500, f)
    })).then(function() {
        return new Promise(function(f) {
            e.cmd("mac set nwkskey " + a + "\r\n", 500, f)
        })
    }).then(function() {
        return new Promise(function(f) {
            e.cmd("mac set appskey " + d + "\r\n", 500, f)
        })
    }).then(function() {
        return new Promise(function(f) {
            e.cmd("mac join ABP\r\n", 2E3, f)
        })
    }).then(function(f) {
        c("ok" ==
            f ? null : void 0 === f ? "Timeout" : f)
    })
};
g.prototype.setMAC = function(b, a) {
    if (this.macOn == b) return a();
    this.macOn = b;
    this.at.cmd("mac " + (b ? "resume" : "pause") + "\r\n", 500, a)
};
g.prototype.radioTX = function(b, a) {
    var d = this.at;
    this.setMAC(!1, function() {
        d.cmd("radio tx " + h(b) + "\r\n", 2E3, a)
    })
};
g.prototype.loraTX = function(b, a) {
    var d = this.at;
    this.setMAC(!0, function() {
        d.cmd("mac tx uncnf 1 " + b + "\r\n", 2E3, function(c) {
            a("ok" == c ? null : void 0 === c ? "Timeout" : c)
        })
    })
};
g.prototype.radioRX = function(b, a) {
    var d = this.at;
    this.setMAC(!1,
        function() {
            d.cmd("radio set wdt " + b + "\r\n", 500, function() {
                d.cmd("radio rx 0\r\n", b + 500, function f(e) {
                    if ("ok" == e) return f;
                    void 0 === e || "radio_rx  " != e.substr(0, 10) ? a() : a(k(e, 10))
                })
            })
        })
};
exports = g