import BigInt from 'big-integer';
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
  P: POW_2_256.minus(BigInt("4294967296")).minus(BigInt(977)),
  // Curve order, a number of valid points in the field
  n: POW_2_256.minus(BigInt("432420386565659656852420866394968145599")),
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
function weistrass(x: any): any {
  const { a, b } = CURVE;
  return mod(x.multiply(x).multiply(x).add(a.multiply(x)).add(b));
}

function numTo32bStr(num: any): string {
  return num.toString(16).padStart(64, "0");
}

class JacobianPoint {
  constructor(readonly x: any, readonly y: any, readonly z: any) {}
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
    const az2 = mod(this.z.multiply(this.z));
    const az3 = mod(this.z.multiply(az2));
    const bz2 = mod(other.z.multiply(other.z));
    const bz3 = mod(other.z.multiply(bz2));
    return (
      mod(this.x.multiply(bz2)).eq(mod(az2.multiply(other.x))) && mod(this.y.multiply(bz3)).eq(mod(az3.multiply(other.y)))
    );
  }
  negate() {
    return new JacobianPoint(this.x, mod(_0n.subtract(this.y)), this.z);
  }
  double() {
    const X1 = this.x;
    const Y1 = this.y;
    const Z1 = this.z;
    const A = mod(X1.multiply(X1));
    const B = mod(Y1.multiply(Y1));
    const C = mod(B.multiply(B));
    const D = mod(_2n.multiply(mod(mod((X1.add(B)).multiply(X1.add(B)))).subtract(A).subtract(C)));
    const E = mod(_3n.multiply(A));
    const F = mod(E.multiply(E));
    const X3 = mod(F.subtract(_2n.multiply(D)));
    const Y3 = mod(E.multiply((D.subtract(X3))).subtract(_8n.multiply(C)));
    const Z3 = mod(_2n.multiply(Y1).multiply(Z1));
    return new JacobianPoint(X3, Y3, Z3);
  }
  add(other: JacobianPoint) {
    const X1 = this.x;
    const Y1 = this.y;
    const Z1 = this.z;
    const X2 = other.x;
    const Y2 = other.y;
    const Z2 = other.z;
    if (X2.isZero() || Y2.isZero()) return this;
    if (X1.isZero() || Y1.isZero()) return other;
    const Z1Z1 = mod(Z1.multiply(Z1));
    const Z2Z2 = mod(Z2.multiply(Z2));
    const U1 = mod(X1.multiply(Z2Z2));
    const U2 = mod(X2.multiply(Z1Z1));
    const S1 = mod(Y1.multiply(Z2).multiply(Z2Z2));
    const S2 = mod(mod(Y2.multiply(Z1)).multiply(Z1Z1));
    const H = mod(U2.subtract(U1));
    const r = mod(S2.subtract(S1));
    if (H.isZero()) {
      if (r.isZero()) {
        return this.double();
      } else {
        return JacobianPoint.ZERO;
      }
    }
    const HH = mod(H.multiply(H));
    const HHH = mod(H.multiply(HH));
    const V = mod(U1.multiply(HH));
    const X3 = mod(r.multiply(r).subtract(HHH).subtract(_2n.multiply(V)));
    const Y3 = mod(r.multiply(V.subtract(X3)).subtract(S1.multiply(HHH)));
    const Z3 = mod(Z1.multiply(Z2).multiply(H));
    return new JacobianPoint(X3, Y3, Z3);
  }
  subtract(other) {
    return this.add(other.negate());
  }
  multiplyUnsafe(scalar: any) {
    const n = mod(BigInt(scalar), CURVE.n);
    let { k1neg, k1, k2neg, k2 } = splitScalarEndo(n);
    let k1p = JacobianPoint.ZERO;
    let k2p = JacobianPoint.ZERO;
    let d: JacobianPoint = this;
    while (k1.isPositive() || k2.isPositive()) {
      if (k1.isOdd()) k1p = k1p.add(d);
      if (k2.isOdd()) k2p = k2p.add(d);
      d = d.double();
      k1=k1.shiftRight(1);
      k2=k2.shiftRight(1);
    }
    if (k1neg) k1p = k1p.negate();
    if (k2neg) k2p = k2p.negate();
    k2p = new JacobianPoint(mod(k2p.x.multiply(CURVE.beta)), k2p.y, k2p.z);
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
      for (let i = 1; i < Math.pow(2, W-1); i++) {
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
    const windowSize = Math.pow(2, W - 1);
    const mask = BigInt(Math.pow(2, W) - 1);
    const maxNumber = Math.pow(2, W);
    const shiftBy = W;
    for (let window = 0; window < windows; window++) {
      const offset = window * windowSize;
      let wbits = n.and(mask).toJSNumber();
      n = n.shiftRight(shiftBy);
      if (wbits > windowSize) {
        wbits -= maxNumber;
        n = n.add(1);
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
    k2p = new JacobianPoint(mod(k2p.x.multiply(CURVE.beta)), k2p.y, k2p.z);
    [point, fake] = [k1p.add(k2p), f1p.add(f2p)];
    return JacobianPoint.normalizeZ([point, fake])[0];
  }
  toAffine(invZ = invert(this.z)) {
    const invZ2 = invZ.multiply(invZ);
    const x = mod(this.x.multiply(invZ2));
    const y = mod(this.y.multiply(invZ2).multiply(invZ));
    return new Point(x, y);
  }
}


const pointPrecomputes = new WeakMap();

export class Point {
  static BASE: Point = new Point(CURVE.Gx, CURVE.Gy);
  _WINDOW_SIZE: number = 8;
  constructor(readonly x: any, readonly y: any) {}
  _setWindowSize(windowSize) {
    this._WINDOW_SIZE = windowSize;
    pointPrecomputes.delete(this);
  }
  public static fromCompressedHex(bytes: Uint8Array) {
    const x = bytesToNumber(bytes.slice(1));
    const y2 = weistrass(x); // y² = x³ + ax + b
    let y = sqrtMod(y2); // y = y² ^ (p+1)/4
    const isYOdd = y.isOdd();
    const isFirstByteOdd = (bytes[0] & 1) === 1;
    if (isFirstByteOdd !== isYOdd) y = mod(_0n.subtract(y));
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
    return hexToBytes(`${this.y.isOdd() ? "03" : "02"}${numTo32bStr(this.x)}`);
  }

  toHex(isCompressed = false): string {
    const x = numTo32bStr(this.x);
    if (isCompressed) {
      return `${this.y.isOdd() ? "03" : "02"}${x}`;
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
    return this.x.eq(other.x) && this.y.eq(other.y);
  }

  // Returns the same point with inverted `y`
  negate() {
    return new Point(this.x, mod(_0n.subtract(this.y)));
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

  multiply(scalar: any) {
    return JacobianPoint.fromAffine(this).multiply(scalar, this).toAffine();
  }
}

function bytesToHex(uint8a) {
  let hex = "";
  for (let i = 0; i < uint8a.length; i++) {
    hex += uint8a[i].toString(16).padStart(2, "0");
  }
  return hex;
}
function hexToBytes(hex) {
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
    const j = i * 2;
    array[i] = Number.parseInt(hex.slice(j, j + 2), 16);
  }
  return array;
}

function bytesToNumber(bytes) {
  return BigInt(`${bytesToHex(bytes)}`, 16);
}

// Calculates a modulo b
function mod(a: any, b: any = CURVE.P): any {
  const result = a.mod(b);
  return result.greaterOrEquals(0) ? result : b.add(result);
}

// Does x ^ (2 ^ power). E.g. 30 ^ (2 ^ 4)
function pow2(x: any, power: any): any {
  const { P } = CURVE;
  let p = power.toJSNumber()
  let res = x;
  while (p-- > 0) {
    res = res.multiply(res);
    res = res.mod(P);
  }
  return res;
}

function sqrtMod(x: any): any {
  const { P } = CURVE;
  const _6n = BigInt(6);
  const _11n = BigInt(11);
  const _22n = BigInt(22);
  const _23n = BigInt(23);
  const _44n = BigInt(44);
  const _88n = BigInt(88);
  const b2 = (x.multiply(x).multiply(x)).mod(P); // x^3, 11
  const b3 = (b2.multiply(b2).multiply(x)).mod(P); // x^7
  const b6 = (pow2(b3, _3n).multiply(b3)).mod(P);
  const b9 = (pow2(b6, _3n).multiply(b3)).mod(P);
  const b11 = (pow2(b9, _2n).multiply(b2)).mod(P);
  const b22 = (pow2(b11, _11n).multiply(b11)).mod(P);
  const b44 = (pow2(b22, _22n).multiply(b22)).mod(P);
  const b88 = (pow2(b44, _44n).multiply(b44)).mod(P);
  const b176 = (pow2(b88, _88n).multiply(b88)).mod(P);
  const b220 = (pow2(b176, _44n).multiply(b44)).mod(P);
  const b223 = (pow2(b220, _3n).multiply(b3)).mod(P);
  const t1 = (pow2(b223, _23n).multiply(b22)).mod(P);
  const t2 = (pow2(t1, _6n).multiply(b2)).mod(P);
  return pow2(t2, _2n);
}

function invert(number, modulo = CURVE.P) {
  let a = mod(number, modulo);
  let b = modulo;
  let [x, y, u, v] = [_0n, _1n, _1n, _0n];
  while (a.neq(0)) {
    const q = b.divide(a);
    const r = b.mod(a);
    const m = x.subtract(u.multiply(q));
    const n = y.subtract(v.multiply(q));
    [b, a] = [a, r];
    [x, y] = [u, v];
    [u, v] = [m, n];
  }
  return mod(x, modulo);
}

function invertBatch(nums, n = CURVE.P) {
  const len = nums.length;
  const scratch = new Array(len);
  let acc =_1n;
  for (let i = 0; i < len; i++) {
    if (nums[i].eq(0)) continue;
    scratch[i] = acc;
    acc = mod(acc.multiply(nums[i]), n);
  }
  acc = invert(acc, n);
  for (let i = len - 1; i >= 0; i--) {
    if (nums[i].eq(0)) continue;
    const tmp = mod(acc.multiply(nums[i]), n);
    nums[i] = mod(acc.multiply(scratch[i]), n);
    acc = tmp;
  }
  return nums;
}
const divNearest = (a: any, b: any) => (a.add(b.divide(_2n))).divide(b);
const POW_2_128 = BigInt("340282366920938463463374607431768211456");
function splitScalarEndo(k: any) {
  const { n } = CURVE;
  const a1 = BigInt("3086d221a7d46bcde86c90e49284eb15", 16);
  const b1 = BigInt("-303414439467246543595250775667605759171");
  const b1_ = BigInt("303414439467246543595250775667605759171");
  const a2 = BigInt("114ca50f7a8e2f3f657c1108d9d44cfd8", 16);
  const b2 = a1;
  const c1 = divNearest(b2.multiply(k), n);
  const c2 = divNearest(b1_.multiply(k), n);
  let k1 = mod(k.subtract(c1.multiply(a1)).subtract(c2.multiply(a2)), n);
  let k2 = mod(_0n.subtract(c1.multiply(b1)).subtract(c2.multiply(b2)), n);
  const k1neg = k1.greater(POW_2_128);
  const k2neg = k2.greater(POW_2_128);
  if (k1neg) k1 = n.subtract(k1);
  if (k2neg) k2 = n.subtract(k2);
  return {k1neg, k1, k2neg, k2};
}
