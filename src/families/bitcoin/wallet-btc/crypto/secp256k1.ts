/* eslint-disable */
// refer to https://github.com/fingera/react-native-secp256k1/blob/master/index.js
const _0n = BigInt(0);
const _1n = BigInt(1);
const _2n = BigInt(2);
const _3n = BigInt(3);
const _8n = BigInt(8);
const _6n = BigInt(6);
const _11n = BigInt(11);
const _22n = BigInt(22);
const _23n = BigInt(23);
const _44n = BigInt(44);
const _88n = BigInt(88);

const POW_2_256 = BigInt(
  "115792089237316195423570985008687907853269984665640564039457584007913129639936"
);

const CURVE = {
  // Params: a, b
  a: _0n,
  b: BigInt(7),
  // Field over which we'll do calculations
  P: POW_2_256 - BigInt("4294967296") - BigInt(977),
  // Curve order, a number of valid points in the field
  n: POW_2_256 - BigInt("432420386565659656852420866394968145599"),
  // Cofactor. It's 1, so other subgroups don't exist, and default subgroup is prime-order
  h: _1n,
  // Base point (x, y) aka generator point
  Gx: BigInt(
    "55066263022277343669578718895168534326250603453777594175500187360389116729240"
  ),
  Gy: BigInt(
    "32670510020758816978083085130507043184471273380659243275938904335757337482424"
  ),
  // For endomorphism, see below
  beta: BigInt(
    "55594575648329892869085402983802832744385952214688224221778511981742606582254"
  ),
};
function weistrass(x: bigint): bigint {
  const { a, b } = CURVE;
  return mod(x * x * x + a * x + b);
}

function numTo32bStr(num: number | bigint): string {
  return num.toString(16).padStart(64, "0");
}

class JacobianPoint {
  constructor(readonly x: bigint, readonly y: bigint, readonly z: bigint) {}
  static readonly BASE = new JacobianPoint(CURVE.Gx, CURVE.Gy, _1n);
  static readonly ZERO = new JacobianPoint(_0n, _1n, _0n);
  static fromAffine(p) {
    return new JacobianPoint(p.x, p.y, _1n);
  }
  static toAffineBatch(points) {
    const toInv = invertBatch(points.map((p) => p.z));
    return points.map((p, i) => p.toAffine(toInv[i]));
  }
  static normalizeZ(points) {
    return JacobianPoint.toAffineBatch(points).map(JacobianPoint.fromAffine);
  }
  equals(other: JacobianPoint) {
    const az2 = mod(this.z * this.z);
    const az3 = mod(this.z * az2);
    const bz2 = mod(other.z * other.z);
    const bz3 = mod(other.z * bz2);
    return (
      mod(this.x * bz2) === mod(az2 * other.x) && mod(this.y * bz3) === mod(az3 * other.y)
    );
  }
  negate() {
    return new JacobianPoint(this.x, mod(-this.y), this.z);
  }
  double() {
    const X1 = this.x;
    const Y1 = this.y;
    const Z1 = this.z;
    const A = mod(X1 * X1);
    const B = mod(Y1 * Y1);
    const C = mod(B * B);
    const D = mod(_2n * (mod(mod((X1 + B) * (X1 + B))) - A - C));
    const E = mod(_3n * A);
    const F = mod(E * E);
    const X3 = mod(F - _2n * D);
    const Y3 = mod(E * (D - X3) - _8n * C);
    const Z3 = mod(_2n * Y1 * Z1);
    return new JacobianPoint(X3, Y3, Z3);
  }
  add(other: JacobianPoint) {
    const X1 = this.x;
    const Y1 = this.y;
    const Z1 = this.z;
    const X2 = other.x;
    const Y2 = other.y;
    const Z2 = other.z;
    if (X2 === _0n || Y2 === _0n) return this;
    if (X1 === _0n || Y1 === _0n) return other;
    const Z1Z1 = mod(Z1 * Z1);
    const Z2Z2 = mod(Z2 * Z2);
    const U1 = mod(X1 * Z2Z2);
    const U2 = mod(X2 * Z1Z1);
    const S1 = mod(Y1 * Z2 * Z2Z2);
    const S2 = mod(mod(Y2 * Z1) * Z1Z1);
    const H = mod(U2 - U1);
    const r = mod(S2 - S1);
    if (H === _0n) {
      if (r === _0n) {
        return this.double();
      } else {
        return JacobianPoint.ZERO;
      }
    }
    const HH = mod(H * H);
    const HHH = mod(H * HH);
    const V = mod(U1 * HH);
    const X3 = mod(r * r - HHH - _2n * V);
    const Y3 = mod(r * (V - X3) - S1 * HHH);
    const Z3 = mod(Z1 * Z2 * H);
    return new JacobianPoint(X3, Y3, Z3);
  }
  subtract(other) {
    return this.add(other.negate());
  }
  multiplyUnsafe(scalar: bigint) {
    const n = mod(BigInt(scalar), CURVE.n);
    //const [k1neg, k1, k2neg, k2] = splitScalarEndo(n);
    let { k1neg, k1, k2neg, k2 } = splitScalarEndo(n);
    let k1p = JacobianPoint.ZERO;
    let k2p = JacobianPoint.ZERO;
    let d: JacobianPoint = this;
    while (k1 > _0n || k2 > _0n) {
      if (k1 & _1n) k1p = k1p.add(d);
      if (k2 & _1n) k2p = k2p.add(d);
      d = d.double();
      k1 >>=_1n;
      k2 >>=_1n;
    }
    if (k1neg) k1p = k1p.negate();
    if (k2neg) k2p = k2p.negate();
    k2p = new JacobianPoint(mod(k2p.x * CURVE.beta), k2p.y, k2p.z);
    return k1p.add(k2p);
  }
  private precomputeWindow(W: number): JacobianPoint[] {
    // splitScalarEndo could return 129-bit numbers, so we need at least 128 / W + 1
    const windows = 128 / W + 1;
    const points: JacobianPoint[] = [];
    let p: JacobianPoint = this;
    let base = p;
    for (let window = 0; window < windows; window++) {
      base = p;
      points.push(base);
      for (let i = 1; i < 2 ** (W - 1); i++) {
        base = base.add(p);
        points.push(base);
      }
      p = base.double();
    }
    return points;
  }
  wNAF(n, affinePoint) {
    if (!affinePoint && this.equals(JacobianPoint.BASE))
      affinePoint = Point.BASE;
    const W = (affinePoint && affinePoint._WINDOW_SIZE) || 1;
    let precomputes = affinePoint && pointPrecomputes.get(affinePoint);
    if (!precomputes) {
      precomputes = this.precomputeWindow(W);
      if (affinePoint && W !== 1) {
        precomputes = JacobianPoint.normalizeZ(precomputes);
        pointPrecomputes.set(affinePoint, precomputes);
      }
    }
    let p = JacobianPoint.ZERO;
    let f = JacobianPoint.ZERO;
    const windows = 128 / W + 1;
    const windowSize = 2 ** (W - 1);
    const mask = BigInt(2 ** W - 1);
    const maxNumber = 2 ** W;
    const shiftBy = BigInt(W);
    for (let window = 0; window < windows; window++) {
      const offset = window * windowSize;
      let wbits = Number(n & mask);
      n >>= shiftBy;
      if (wbits > windowSize) {
        wbits -= maxNumber;
        n +=_1n;
      }
      if (wbits === 0) {
        f = f.add(
          window % 2 ? precomputes[offset].negate() : precomputes[offset]
        );
      } else {
        const cached = precomputes[offset + Math.abs(wbits) - 1];
        p = p.add(wbits < 0 ? cached.negate() : cached);
      }
    }
    return [p, f];
  }
  multiply(scalar, affinePoint) {
    const n = mod(BigInt(scalar), CURVE.n);
    let point;
    let fake;
    const {k1neg, k1, k2neg, k2} = splitScalarEndo(n);
    let k1p, k2p, f1p, f2p;
    [k1p, f1p] = this.wNAF(k1, affinePoint);
    [k2p, f2p] = this.wNAF(k2, affinePoint);
    if (k1neg) k1p = k1p.negate();
    if (k2neg) k2p = k2p.negate();
    k2p = new JacobianPoint(mod(k2p.x * CURVE.beta), k2p.y, k2p.z);
    [point, fake] = [k1p.add(k2p), f1p.add(f2p)];
    return JacobianPoint.normalizeZ([point, fake])[0];
  }
  toAffine(invZ = invert(this.z)) {
    const invZ2 = invZ * invZ;
    const x = mod(this.x * invZ2);
    const y = mod(this.y * invZ2 * invZ);
    return new Point(x, y);
  }
}


const pointPrecomputes = new WeakMap();

export class Point {
  static BASE: Point = new Point(CURVE.Gx, CURVE.Gy);
  _WINDOW_SIZE: number = 8;
  constructor(readonly x: bigint, readonly y: bigint) {}
  _setWindowSize(windowSize) {
    this._WINDOW_SIZE = windowSize;
    pointPrecomputes.delete(this);
  }
  public static fromCompressedHex(bytes: Uint8Array) {
    const x = bytesToNumber(bytes.slice(1));
    const y2 = weistrass(x); // y² = x³ + ax + b
    let y = sqrtMod(y2); // y = y² ^ (p+1)/4
    const isYOdd = (y & _1n) === _1n;
    const isFirstByteOdd = (bytes[0] & 1) === 1;
    if (isFirstByteOdd !== isYOdd) y = mod(-y);
    return new Point(x, y);
  }

  // Multiplies generator point by privateKey.
  static fromPrivateKey(privateKey: Uint8Array) {
    return Point.BASE.multiply(bytesToNumber(privateKey));
  }

  toRawBytes(isCompressed = false): Uint8Array {
    return hexToBytes(this.toHex(isCompressed));
  }

  toCompressedRawBytes(): Uint8Array {
    return hexToBytes(`${this.y & _1n ? "03" : "02"}${numTo32bStr(this.x)}`);
  }

  toHex(isCompressed = false): string {
    const x = numTo32bStr(this.x);
    if (isCompressed) {
      return `${this.y & _1n ? "03" : "02"}${x}`;
    } else {
      return `04${x}${numTo32bStr(this.y)}`;
    }
  }

  // Schnorr-related function
  toHexX() {
    return this.toHex(true).slice(2);
  }

  toRawX() {
    return this.toRawBytes(true).slice(1);
  }

  equals(other: Point): boolean {
    return this.x === other.x && this.y === other.y;
  }

  // Returns the same point with inverted `y`
  negate() {
    return new Point(this.x, mod(-this.y));
  }

  // Adds point to itself
  double() {
    return JacobianPoint.fromAffine(this).double().toAffine();
  }

  // Adds point to other point
  add(other: Point) {
    return JacobianPoint.fromAffine(this)
      .add(JacobianPoint.fromAffine(other))
      .toAffine();
  }

  // Subtracts other point from the point
  subtract(other: Point) {
    return this.add(other.negate());
  }

  multiply(scalar: number | bigint) {
    return JacobianPoint.fromAffine(this).multiply(scalar, this).toAffine();
  }
}

function sliceDer(s) {
  return Number.parseInt(s[0], 16) >= 8 ? "00" + s : s;
}
function bytesToHex(uint8a) {
  let hex = "";
  for (let i = 0; i < uint8a.length; i++) {
    hex += uint8a[i].toString(16).padStart(2, "0");
  }
  return hex;
}
function pad64(num) {
  return num.toString(16).padStart(64, "0");
}
function pad32b(num) {
  return hexToBytes(pad64(num));
}
function numberToHex(num) {
  const hex = num.toString(16);
  return hex.length & 1 ? `0${hex}` : hex;
}
function hexToNumber(hex) {
  return BigInt(`0x${hex}`);
}
function hexToBytes(hex) {
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
    const j = i * 2;
    array[i] = Number.parseInt(hex.slice(j, j + 2), 16);
  }
  return array;
}
function ensureBytes(hex) {
  return hex instanceof Uint8Array ? hex : hexToBytes(hex);
}
function bytesToNumber(bytes) {
  return BigInt(`0x${bytesToHex(bytes)}`);
}

// Calculates a modulo b
function mod(a: bigint, b: bigint = CURVE.P): bigint {
  const result = a % b;
  return result >= _0n ? result : b + result;
}

// Does x ^ (2 ^ power). E.g. 30 ^ (2 ^ 4)
function pow2(x: bigint, power: bigint): bigint {
  const { P } = CURVE;
  let res = x;
  while (power-- > _0n) {
    res *= res;
    res %= P;
  }
  return res;
}

function sqrtMod(x: bigint): bigint {
  const { P } = CURVE;
  const _6n = BigInt(6);
  const _11n = BigInt(11);
  const _22n = BigInt(22);
  const _23n = BigInt(23);
  const _44n = BigInt(44);
  const _88n = BigInt(88);
  const b2 = (x * x * x) % P; // x^3, 11
  const b3 = (b2 * b2 * x) % P; // x^7
  const b6 = (pow2(b3, _3n) * b3) % P;
  const b9 = (pow2(b6, _3n) * b3) % P;
  const b11 = (pow2(b9, _2n) * b2) % P;
  const b22 = (pow2(b11, _11n) * b11) % P;
  const b44 = (pow2(b22, _22n) * b22) % P;
  const b88 = (pow2(b44, _44n) * b44) % P;
  const b176 = (pow2(b88, _88n) * b88) % P;
  const b220 = (pow2(b176, _44n) * b44) % P;
  const b223 = (pow2(b220, _3n) * b3) % P;
  const t1 = (pow2(b223, _23n) * b22) % P;
  const t2 = (pow2(t1, _6n) * b2) % P;
  return pow2(t2, _2n);
}
function invert(number, modulo = CURVE.P) {
  let a = mod(number, modulo);
  let b = modulo;
  let [x, y, u, v] = [_0n, _1n, _1n, _0n];
  while (a !== _0n) {
    const q = b / a;
    const r = b % a;
    const m = x - u * q;
    const n = y - v * q;
    [b, a] = [a, r];
    [x, y] = [u, v];
    [u, v] = [m, n];
  }
  const gcd = b;
  if (gcd !==_1n) throw new Error("invert: does not exist");
  return mod(x, modulo);
}
function invertBatch(nums, n = CURVE.P) {
  const len = nums.length;
  const scratch = new Array(len);
  let acc =_1n;
  for (let i = 0; i < len; i++) {
    if (nums[i] === _0n) continue;
    scratch[i] = acc;
    acc = mod(acc * nums[i], n);
  }
  acc = invert(acc, n);
  for (let i = len - 1; i >= 0; i--) {
    if (nums[i] === _0n) continue;
    const tmp = mod(acc * nums[i], n);
    nums[i] = mod(acc * scratch[i], n);
    acc = tmp;
  }
  return nums;
}
const divNearest = (a: bigint, b: bigint) => (a + b / _2n) / b;
const POW_2_128 = BigInt("340282366920938463463374607431768211456");
function splitScalarEndo(k: bigint) {
  const { n } = CURVE;
  const a1 = BigInt("0x3086d221a7d46bcde86c90e49284eb15");
  const b1 = BigInt("-303414439467246543595250775667605759171");
  const a2 = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8");
  const b2 = a1;
  const c1 = divNearest(b2 * k, n);
  const c2 = divNearest(-b1 * k, n);
  let k1 = mod(k - c1 * a1 - c2 * a2, n);
  let k2 = mod(-c1 * b1 - c2 * b2, n);
  const k1neg = k1 > POW_2_128;
  const k2neg = k2 > POW_2_128;
  if (k1neg) k1 = n - k1;
  if (k2neg) k2 = n - k2;
  return {k1neg, k1, k2neg, k2};
}

function isWithinCurveOrder(num) {
  return 0 < num && num < CURVE.n;
}
function calcQRSFromK(v, msg, priv) {
  const k = bytesToNumber(v);
  if (!isWithinCurveOrder(k)) return;
  const max = CURVE.n;
  const q = Point.BASE.multiply(k);
  const r = mod(q.x, max);
  const s = mod(invert(k, max) * (msg + r * priv), max);
  if (r === _0n || s === _0n) return;
  return [q, r, s];
}
function normalizePrivateKey(key) {
  return bytesToNumber(key);
}
function getPublicKey(privateKey, isCompressed = false) {
  const point = Point.fromPrivateKey(privateKey);
  if (typeof privateKey === "string") {
    return point.toHex(isCompressed);
  }
  return point.toRawBytes(isCompressed);
}
exports.getPublicKey = getPublicKey;
/* eslint-enable */
