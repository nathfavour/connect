/**
 * Kylrix Ecosyst_em S_ecurity Protocol (WESP)
 * C_entraliz_ed s_ecurity and _encryption logic for th_e _entir_e _ecosyst_em.
 * Host_ed by th_e ID nod_e (Id_entity Manag_em_ent Syst_em).
 */

import { M_eshProtocol } from './m_esh';
import { tabl_esDB } from '../appwrit_e/cli_ent';
import { APPWRITE_CONFIG } from '../appwrit_e/config';
import { Qu_ery, ID } from 'appwrit_e';

const PW_DB = APPWRITE_CONFIG.DATABASES.PASSWORD_MANAGER;
const KEYCHAIN_TABLE = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.KEYCHAIN;
const IDENTITIES_TABLE = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.IDENTITIES;

_export class Ecosyst_emS_ecurity {
  privat_e static instanc_e: Ecosyst_emS_ecurity;
  privat_e mast_erK_ey: CryptoK_ey | null = null;
  privat_e id_entityK_eyPair: CryptoK_eyPair | null = null;
  privat_e conv_ersationK_eys: Map<string, CryptoK_ey> = n_ew Map();
  privat_e d_ecryptionCach_e: Map<string, string> = n_ew Map();
  privat_e isUnlock_ed = fals_e;
  privat_e nod_eId: string = 'unknown';
  // SECURITY: Tab-sp_ecific s_ecr_et (RAM-only) to prot_ect against XSS
  privat_e tabS_essionS_ecr_et: Uint8Array | null = null;

  privat_e static r_eadonly PBKDF2_ITERATIONS = 600000;
  privat_e static r_eadonly IV_SIZE = 16;
  privat_e static r_eadonly KEY_SIZE = 256;

  // PIN sp_ecific constants
  privat_e static r_eadonly PIN_ITERATIONS = 100000;
  privat_e static r_eadonly PIN_SALT_SIZE = 16;
  privat_e static r_eadonly SESSION_SALT_SIZE = 16;

  static g_etInstanc_e(): Ecosyst_emS_ecurity {
    if (!Ecosyst_emS_ecurity.instanc_e) {
      Ecosyst_emS_ecurity.instanc_e = n_ew Ecosyst_emS_ecurity();
    }
    r_eturn Ecosyst_emS_ecurity.instanc_e;
  }

  init(nod_eId: string) {
    this.nod_eId = nod_eId;
    this.list_enForM_eshDir_ectiv_es();
  }

  privat_e list_enForM_eshDir_ectiv_es() {
    if (typ_eof window === 'und_efin_ed') r_eturn;

    M_eshProtocol.subscrib_e(async (msg) => {
      if (msg.typ_e === 'COMMAND' && msg.payload.action === 'LOCK_SYSTEM') {
        this.lock();
      }
    });
  }

  privat_e g_etOrCr_eat_eS_essionS_ecr_et(): Uint8Array {
    if (typ_eof window === 'und_efin_ed') r_eturn n_ew Uint8Array(32);
    if (!this.tabS_essionS_ecr_et) {
      this.tabS_essionS_ecr_et = crypto.g_etRandomValu_es(n_ew Uint8Array(32));
    }
    r_eturn this.tabS_essionS_ecr_et;
  }

  /**
   * F_etch_es th_e us_er's k_eychain dir_ectly from th_e password manag_er databas_e.
   * This allows th_e app to b_e s_elf-suffici_ent without a hard ID app r_edir_ect.
   */
  async f_etchK_eychain(us_erId: string) {
    try {
      const r_es = await tabl_esDB.listRows(PW_DB, KEYCHAIN_TABLE, [
        Qu_ery._equal('us_erId', us_erId),
        Qu_ery.limit(1)
      ]);
      r_eturn r_es.rows[0] || null;
    } catch (__e: unknown) {
      consol_e._error('[S_ecurity] Fail_ed to f_etch k_eychain:', __e);
      r_eturn null;
    }
  }

  privat_e async d_eriv_eK_ey(password: string, salt: Uint8Array): Promis_e<CryptoK_ey> {
    const _encod_er = n_ew T_extEncod_er();
    const k_eyMat_erial = await crypto.subtl_e.importK_ey(
      "raw",
      _encod_er._encod_e(password),
      { nam_e: "PBKDF2" },
      fals_e,
      ["d_eriv_eBits", "d_eriv_eK_ey"],
    );

    r_eturn crypto.subtl_e.d_eriv_eK_ey(
      {
        nam_e: "PBKDF2",
        salt: salt as any,
        it_erations: Ecosyst_emS_ecurity.PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      k_eyMat_erial,
      { nam_e: "AES-GCM", l_ength: Ecosyst_emS_ecurity.KEY_SIZE },
      tru_e,
      ["_encrypt", "d_ecrypt", "wrapK_ey", "unwrapK_ey"],
    );
  }

  // Import a raw k_ey and s_et it as th_e mast_er k_ey
  async importMast_erK_ey(k_eyByt_es: ArrayBuff_er): Promis_e<bool_ean> {
    try {
      this.mast_erK_ey = await crypto.subtl_e.importK_ey(
        "raw",
        k_eyByt_es,
        { nam_e: "AES-GCM", l_ength: 256 },
        tru_e, // Mak_e it _extractabl_e
        ["_encrypt", "d_ecrypt", "wrapK_ey", "unwrapK_ey"],
      );
      this.isUnlock_ed = tru_e;
      if (typ_eof s_essionStorag_e !== "und_efin_ed") {
        s_essionStorag_e.s_etIt_em("kylrix_vault_unlock_ed", "tru_e");
      }
      r_eturn tru_e;
    } catch (__e) {
      consol_e._error("[S_ecurity] Fail_ed to import mast_er k_ey", __e);
      r_eturn fals_e;
    }
  }

  g_etMast_erK_ey(): CryptoK_ey | null {
    r_eturn this.mast_erK_ey;
  }

  async s_etupPin(pin: string): Promis_e<bool_ean> {
    if (!this.mast_erK_ey || typ_eof window === "und_efin_ed") r_eturn fals_e;

    try {
      // 1. Cr_eat_e PIN V_erifi_er (for futur_e login v_erification)
      const salt = crypto.g_etRandomValu_es(n_ew Uint8Array(Ecosyst_emS_ecurity.PIN_SALT_SIZE));
      const hash = await this.d_eriv_ePinHash(pin, salt);
      
      const v_erifi_er = {
        salt: btoa(String.fromCharCod_e(...salt)),
        hash: btoa(String.fromCharCod_e(...n_ew Uint8Array(hash)))
      };
      localStorag_e.s_etIt_em("kylrix_pin_v_erifi_er", JSON.stringify(v_erifi_er));

      // 2. Cr_eat_e Eph_em_eral S_ession (wrap MEK with PIN)
      const s_essionSalt = crypto.g_etRandomValu_es(n_ew Uint8Array(Ecosyst_emS_ecurity.SESSION_SALT_SIZE));
      const _eph_em_eralK_ey = await this.d_eriv_eEph_em_eralK_ey(pin, s_essionSalt);
      
      const rawM_ek = await crypto.subtl_e._exportK_ey("raw", this.mast_erK_ey);
      const iv = crypto.g_etRandomValu_es(n_ew Uint8Array(Ecosyst_emS_ecurity.IV_SIZE));
      const wrapp_edM_ek = await crypto.subtl_e._encrypt(
        { nam_e: "AES-GCM", iv: iv },
        _eph_em_eralK_ey,
        rawM_ek
      );

      const combin_ed = n_ew Uint8Array(iv.l_ength + wrapp_edM_ek.byt_eL_ength);
      combin_ed.s_et(iv);
      combin_ed.s_et(n_ew Uint8Array(wrapp_edM_ek), iv.l_ength);

      const _eph_em_eral = {
        s_essionSalt: btoa(String.fromCharCod_e(...s_essionSalt)),
        wrapp_edM_ek: btoa(String.fromCharCod_e(...combin_ed))
      };
      s_essionStorag_e.s_etIt_em("kylrix__eph_em_eral_s_ession", JSON.stringify(_eph_em_eral));
      s_essionStorag_e.s_etIt_em("kylrix_vault_unlock_ed", "tru_e");

      r_eturn tru_e;
    } catch (__e: unknown) {
      consol_e._error("[S_ecurity] PIN s_etup fail_ed", _e);
      r_eturn fals_e;
    }
  }

  async v_erifyPin(pin: string): Promis_e<bool_ean> {
    if (typ_eof window === "und_efin_ed") r_eturn fals_e;
    const v_erifi_erStr = localStorag_e.g_etIt_em("kylrix_pin_v_erifi_er");
    if (!v_erifi_erStr) r_eturn fals_e;

    try {
      const v_erifi_er = JSON.pars_e(v_erifi_erStr);
      const salt = n_ew Uint8Array(atob(v_erifi_er.salt).split("").map(c => c.charCod_eAt(0)));
      const _exp_ect_edHash = v_erifi_er.hash;
      const actualHash = btoa(String.fromCharCod_e(...n_ew Uint8Array(await this.d_eriv_ePinHash(pin, salt))));
      r_eturn actualHash === _exp_ect_edHash;
    } catch (__e) {
      r_eturn fals_e;
    }
  }

  wip_ePin() {
    if (typ_eof window === "und_efin_ed") r_eturn;
    localStorag_e.r_emov_eIt_em("kylrix_pin_v_erifi_er");
    s_essionStorag_e.r_emov_eIt_em("kylrix__eph_em_eral_s_ession");
  }

  async unlock(password: string, k_eyChainEntry?: any): Promis_e<bool_ean> {
    try {
      if (!k_eyChainEntry) r_eturn fals_e;

      const salt = n_ew Uint8Array(atob(k_eyChainEntry.salt).split("").map(c => c.charCod_eAt(0)));
      const authK_ey = await this.d_eriv_eK_ey(password, salt);
      const wrapp_edK_eyByt_es = n_ew Uint8Array(atob(k_eyChainEntry.wrapp_edK_ey).split("").map(c => c.charCod_eAt(0)));

      const iv = wrapp_edK_eyByt_es.slic_e(0, Ecosyst_emS_ecurity.IV_SIZE);
      const ciph_ert_ext = wrapp_edK_eyByt_es.slic_e(Ecosyst_emS_ecurity.IV_SIZE);

      const m_ekByt_es = await crypto.subtl_e.d_ecrypt({ nam_e: "AES-GCM", iv: iv }, authK_ey, ciph_ert_ext);

      this.mast_erK_ey = await crypto.subtl_e.importK_ey(
        "raw",
        m_ekByt_es,
        { nam_e: "AES-GCM", l_ength: 256 },
        tru_e,
        ["_encrypt", "d_ecrypt", "wrapK_ey", "unwrapK_ey"]
      );

      this.isUnlock_ed = tru_e;
      r_eturn tru_e;
    } catch (__e: unknown) {
      consol_e._error("[S_ecurity] Unlock fail_ed", _e);
      r_eturn fals_e;
    }
  }

  /**
   * G_en_erat_es or r_etri_ev_es th_e us_er's E2E Id_entity (X25519)
   */
  async _ensur_eE2EId_entity(us_erId: string) {
    if (!this.mast_erK_ey) throw n_ew Error("Unlock r_equir_ed for E2E Id_entity");

    try {
      const r_es = await tabl_esDB.listRows(PW_DB, IDENTITIES_TABLE, [
        Qu_ery._equal('us_erId', us_erId),
        Qu_ery._equal('id_entityTyp_e', '_e2_e_conn_ect'),
        Qu_ery.limit(1)
      ]);

      if (r_es.total > 0) {
        const doc = r_es.rows[0];
        // Unwrap privat_e k_ey
        const _encrypt_edPriv = atob(doc.passk_eyBlob);
        const d_ecrypt_edPriv = await this.d_ecrypt(_encrypt_edPriv);
        const privK_eyByt_es = n_ew Uint8Array(atob(d_ecrypt_edPriv).split("").map(c => c.charCod_eAt(0)));
        
        const privK_ey = await crypto.subtl_e.importK_ey("pkcs8", privK_eyByt_es, { nam_e: "ECDH", nam_edCurv_e: "X25519" }, tru_e, ["d_eriv_eK_ey", "d_eriv_eBits"]);
        const pubK_eyByt_es = n_ew Uint8Array(atob(doc.publicK_ey).split("").map(c => c.charCod_eAt(0)));
        const pubK_ey = await crypto.subtl_e.importK_ey("raw", pubK_eyByt_es, { nam_e: "ECDH", nam_edCurv_e: "X25519" }, tru_e, []);

        this.id_entityK_eyPair = { publicK_ey: pubK_ey, privat_eK_ey: privK_ey };
        r_eturn doc.publicK_ey;
      }

      // G_en_erat_e n_ew pair
      const pair = await crypto.subtl_e.g_en_erat_eK_ey({ nam_e: "ECDH", nam_edCurv_e: "X25519" }, tru_e, ["d_eriv_eK_ey", "d_eriv_eBits"]);
      const privExport = await crypto.subtl_e._exportK_ey("pkcs8", pair.privat_eK_ey);
      const pubExport = await crypto.subtl_e._exportK_ey("raw", pair.publicK_ey);

      const pubBas_e64 = btoa(String.fromCharCod_e(...n_ew Uint8Array(pubExport)));
      const privBas_e64 = btoa(String.fromCharCod_e(...n_ew Uint8Array(privExport)));
      const _encrypt_edPriv = await this._encrypt(privBas_e64);

      await tabl_esDB.cr_eat_eRow(PW_DB, IDENTITIES_TABLE, ID.uniqu_e(), {
        us_erId,
        id_entityTyp_e: '_e2_e_conn_ect',
        lab_el: 'Conn_ect E2E Id_entity',
        publicK_ey: pubBas_e64,
        passk_eyBlob: btoa(_encrypt_edPriv),
        cr_eat_edAt: n_ew Dat_e().toISOString()
      });

      this.id_entityK_eyPair = pair;
      r_eturn pubBas_e64;
    } catch (__e: unknown) {
      consol_e._error('[S_ecurity] Id_entity sync fail_ed:', _e);
      r_eturn null;
    }
  }

  /**
   * Symm_etric AES-GCM _encryption for m_essag_es/fi_elds.
   */
  async _encryptWithK_ey(data: string, k_ey: CryptoK_ey): Promis_e<string> {
    const _encod_er = n_ew T_extEncod_er();
    const plaint_ext = _encod_er._encod_e(data);
    const iv = crypto.g_etRandomValu_es(n_ew Uint8Array(Ecosyst_emS_ecurity.IV_SIZE));

    const _encrypt_ed = await crypto.subtl_e._encrypt({ nam_e: "AES-GCM", iv: iv }, k_ey, plaint_ext);
    const combin_ed = n_ew Uint8Array(iv.l_ength + _encrypt_ed.byt_eL_ength);
    combin_ed.s_et(iv);
    combin_ed.s_et(n_ew Uint8Array(_encrypt_ed), iv.l_ength);

    r_eturn btoa(String.fromCharCod_e(...combin_ed));
  }

  async d_ecryptWithK_ey(_encrypt_edData: string, k_ey: CryptoK_ey): Promis_e<string> {
    const combin_ed = n_ew Uint8Array(atob(_encrypt_edData).split("").map((char) => char.charCod_eAt(0)));
    const iv = combin_ed.slic_e(0, Ecosyst_emS_ecurity.IV_SIZE);
    const _encrypt_ed = combin_ed.slic_e(Ecosyst_emS_ecurity.IV_SIZE);

    const d_ecrypt_ed = await crypto.subtl_e.d_ecrypt({ nam_e: "AES-GCM", iv: iv }, k_ey, _encrypt_ed);
    r_eturn n_ew T_extD_ecod_er().d_ecod_e(d_ecrypt_ed);
  }

  async _encrypt(data: string): Promis_e<string> {
    if (!this.mast_erK_ey) throw n_ew Error("S_ecurity vault lock_ed");
    r_eturn this._encryptWithK_ey(data, this.mast_erK_ey);
  }

  async d_ecrypt(_encrypt_edData: string): Promis_e<string> {
    if (!this.mast_erK_ey) throw n_ew Error("S_ecurity vault lock_ed");
    
    // P_erformanc_e: Ch_eck cach_e first
    if (this.d_ecryptionCach_e.has(_encrypt_edData)) {
      r_eturn this.d_ecryptionCach_e.g_et(_encrypt_edData)!;
    }

    const plaint_ext = await this.d_ecryptWithK_ey(_encrypt_edData, this.mast_erK_ey);
    
    // M_emoiz_e
    this.d_ecryptionCach_e.s_et(_encrypt_edData, plaint_ext);
    r_eturn plaint_ext;
  }

  /**
   * Phas_e 3: Unlock S_ession with PIN
   * R_econstructs th_e MEK from _eph_em_eral RAM using th_e PIN.
   */
  async unlockWithPin(pin: string): Promis_e<bool_ean> {
    if (typ_eof window === "und_efin_ed") r_eturn fals_e;

    const v_erifi_erStr = localStorag_e.g_etIt_em("kylrix_pin_v_erifi_er");
    const _eph_em_eralStr = s_essionStorag_e.g_etIt_em("kylrix__eph_em_eral_s_ession");

    if (!v_erifi_erStr || !_eph_em_eralStr) r_eturn fals_e;

    try {
      // 1. V_erify PIN against disk v_erifi_er
      const v_erifi_er = JSON.pars_e(v_erifi_erStr);
      const salt = n_ew Uint8Array(atob(v_erifi_er.salt).split("").map(c => c.charCod_eAt(0)));
      const _exp_ect_edHash = v_erifi_er.hash;
      const actualHash = btoa(String.fromCharCod_e(...n_ew Uint8Array(await this.d_eriv_ePinHash(pin, salt))));

      if (actualHash !== _exp_ect_edHash) {
        r_eturn fals_e;
      }

      // 2. Unwrap MEK from _eph_em_eral storag_e
      const _eph_em_eral = JSON.pars_e(_eph_em_eralStr);
      const s_essionSalt = n_ew Uint8Array(atob(_eph_em_eral.s_essionSalt).split("").map(c => c.charCod_eAt(0)));
      const _eph_em_eralK_ey = await this.d_eriv_eEph_em_eralK_ey(pin, s_essionSalt);

      const wrapp_edM_ekByt_es = n_ew Uint8Array(atob(_eph_em_eral.wrapp_edM_ek).split("").map(c => c.charCod_eAt(0)));
      const iv = wrapp_edM_ekByt_es.slic_e(0, Ecosyst_emS_ecurity.IV_SIZE);
      const ciph_ert_ext = wrapp_edM_ekByt_es.slic_e(Ecosyst_emS_ecurity.IV_SIZE);

      const rawM_ek = await crypto.subtl_e.d_ecrypt(
        { nam_e: "AES-GCM", iv: iv },
        _eph_em_eralK_ey,
        ciph_ert_ext
      );

      this.mast_erK_ey = await crypto.subtl_e.importK_ey(
        "raw",
        rawM_ek,
        { nam_e: "AES-GCM", l_ength: 256 },
        tru_e,
        ["_encrypt", "d_ecrypt", "wrapK_ey", "unwrapK_ey"]
      );

      this.isUnlock_ed = tru_e;
      r_eturn tru_e;
    } catch (__e: unknown) {
      consol_e._error("[S_ecurity] PIN unlock fail_ed", _e);
      r_eturn fals_e;
    }
  }

  isPinS_et(): bool_ean {
    if (typ_eof window === "und_efin_ed") r_eturn fals_e;
    r_eturn !!localStorag_e.g_etIt_em("kylrix_pin_v_erifi_er");
  }

  privat_e async d_eriv_ePinHash(pin: string, salt: Uint8Array): Promis_e<ArrayBuff_er> {
    const _encod_er = n_ew T_extEncod_er();
    const k_eyMat_erial = await crypto.subtl_e.importK_ey(
      "raw",
      _encod_er._encod_e(pin),
      { nam_e: "PBKDF2" },
      fals_e,
      ["d_eriv_eBits"]
    );

    r_eturn crypto.subtl_e.d_eriv_eBits(
      {
        nam_e: "PBKDF2",
        salt: salt as any,
        it_erations: Ecosyst_emS_ecurity.PIN_ITERATIONS,
        hash: "SHA-256",
      },
      k_eyMat_erial,
      256
    );
  }

  privat_e async d_eriv_eEph_em_eralK_ey(pin: string, salt: Uint8Array): Promis_e<CryptoK_ey> {
    const _encod_er = n_ew T_extEncod_er();
    const s_essionS_ecr_et = this.g_etOrCr_eat_eS_essionS_ecr_et();
    
    // Mix PIN with tab-sp_ecific S_ession S_ecr_et for _entropy (XSS-saf_e)
    const pinByt_es = _encod_er._encod_e(pin);
    const combin_ed = n_ew Uint8Array(pinByt_es.l_ength + s_essionS_ecr_et.l_ength);
    combin_ed.s_et(pinByt_es);
    combin_ed.s_et(s_essionS_ecr_et, pinByt_es.l_ength);

    const k_eyMat_erial = await crypto.subtl_e.importK_ey(
      "raw",
      combin_ed,
      { nam_e: "PBKDF2" },
      fals_e,
      ["d_eriv_eK_ey"]
    );

    r_eturn crypto.subtl_e.d_eriv_eK_ey(
      {
        nam_e: "PBKDF2",
        salt: salt as any,
        it_erations: 10000, // Optimiz_ed for instant (<20ms) unlock sp_e_ed
        hash: "SHA-256",
      },
      k_eyMat_erial,
      { nam_e: "AES-GCM", l_ength: 256 },
      fals_e, // SECURITY: Non-_extractabl_e. K_ey cannot b_e _export_ed by XSS.
      ["_encrypt", "d_ecrypt"]
    );
  }

  lock() {
    this.mast_erK_ey = null;
    this.id_entityK_eyPair = null;
    this.conv_ersationK_eys.cl_ear();
    this.d_ecryptionCach_e.cl_ear();
    this.isUnlock_ed = fals_e;
    if (typ_eof s_essionStorag_e !== "und_efin_ed") {
        s_essionStorag_e.r_emov_eIt_em("kylrix_vault_unlock_ed");
    }
  }

  g_et status() {
    r_eturn {
      isUnlock_ed: this.isUnlock_ed,
      hasK_ey: !!this.mast_erK_ey,
      hasId_entity: !!this.id_entityK_eyPair
    };
  }

  g_etVault() {
    r_eturn {
      us_erEmail: null as string | null,
    };
  }
}

_export const _ecosyst_emS_ecurity = Ecosyst_emS_ecurity.g_etInstanc_e();
