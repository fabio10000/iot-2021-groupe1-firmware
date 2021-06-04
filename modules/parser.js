const CODES = {
    "3302": {
        bytes: 1,
        sign: "unsigned",
        transform: 1
    },
    "3303": {
        bytes: 2,
        sign: "signed-msb",
        transform: 0.1
    },
    "3304": {
        bytes: 1,
        sign: "unsigned",
        transform: 0.5
    },
    "3315": {
        bytes: 2,
        sign: "unsigned-msb",
        transform: 0.1
    },
    "3324": {
        bytes: 2,
        sign: "unsigned",
        transform: 0.1
    },
    "3325": {
        bytes: 2,
        sign: "unsigned",
        transform: 1
    }
}

function string_hex_to_int(string, signed = false) {
    var val = parseInt(string, 16)
    if (signed == "signed-msb") {
        var bits = string.length * 4 - 1
        var sign = val >> bits

        if (sign == 1) {
            val ^= 2**bits
            val *= -1
        }
    }
    return val;
}

function int_to_string_hex(value, nb_bytes, signed = false) {
    var val = value
    if (signed == "signed-msb" && val < 0) {
        val *= -1
        val ^= 2**(nb_bytes * 8 - 1)
    }

    var hex = Number(val).toString(16)
    while(hex.length < nb_bytes * 2) {
        hex = "0" + hex;
    }

    return hex
}

exports.decode_payload = function (payload) {
    result = {}
    while(payload.length > 0) {
        var code = parseInt(payload.slice(0,4), 16)
        var code_info = CODES[code]
        payload = payload.slice(4)
    
        var val_length = code_info.bytes * 2
        var hex_value = payload.slice(0, val_length)
        var value = string_hex_to_int(hex_value, code_info.sign) * code_info.transform
        payload = payload.slice(val_length)

        if (code in result) {
            if (!Array.isArray(result[code])) {
                var tmp = result[code]
                result[code] = []
                result[code].push(tmp)
            }
            result[code].push(value)
        } else {
            result[code] = value
        }
    }
    return result
}

function encode_pair(code_hex, code_info, value) {
    return code_hex + int_to_string_hex(
        value / code_info.transform, 
        code_info.bytes,
        code_info.sign
    )
}

exports.encode_payload = function (payload) {
    var result = ""
    for (const [key, value] of Object.entries(payload)) {
        var code_info = CODES[key]
        var code_hex = int_to_string_hex(parseInt(key), 2)
        
        if (Array.isArray(value)) {
            for (i = 0; i < value.length; ++i) {
                result += encode_pair(code_hex, code_info, value[i])
            }
        } else {
            result += encode_pair(code_hex, code_info, value)
        }
    }
    return result
}