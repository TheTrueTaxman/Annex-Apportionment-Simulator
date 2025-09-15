/* Analyzed bindings: {
  "reactive": "setup-const",
  "ref": "setup-const",
  "computed": "setup-const",
  "params": "setup-reactive-const",
  "global": "setup-reactive-const",
  "parties": "setup-reactive-const",
  "resultReady": "setup-ref",
  "resultTable": "setup-ref",
  "errorMessage": "setup-ref",
  "totalVotes": "setup-ref",
  "isValidInput": "setup-ref",
  "formatInt": "setup-const",
  "addParty": "setup-const",
  "removeParty": "setup-const",
  "resetSample": "setup-const",
  "hareEntitlement": "setup-const",
  "computeWeights": "setup-const",
  "roundVal": "setup-const",
  "runSimulation": "setup-const"
} */
import { reactive, ref, computed } from 'vue'


const __sfc__ = {
  __name: 'App',
  setup(__props, { expose: __expose }) {
  __expose();

const params = reactive({
  S: 663,
  alpha: 0.15,
  t_delib: 0.025,
  t_annex: 0.01,
  small_cutoff: 0.10,
  b: 0.15
})

const global = reactive({ roundMode: 'nearest' })

const parties = reactive([
  { code: 'RPNR', name: 'RPNR', votes: 3217496, d: 130, inAnnex: true },
  { code: 'PSD+', name: 'PSD+', votes: 2190223, d: 118, inAnnex: true },
  { code: 'PRN', name: 'PRN', votes: 1279246, d: 24, inAnnex: true },
  { code: 'PS', name: 'PS', votes: 1162950, d: 58, inAnnex: true },
  { code: 'ADLR', name: 'ADLR', votes: 1027273, d: 98, inAnnex: true },
  { code: 'NTEA', name: 'NTEA', votes: 775300, d: 31, inAnnex: true },
  { code: 'NDC', name: 'NDC', votes: 775300, d: 86, inAnnex: true },
  { code: 'LTI', name: 'LTI', votes: 639623, d: 58, inAnnex: true },
  { code: 'PEV', name: 'PÉV', votes: 503945, d: 21, inAnnex: true },
  { code: 'PPI', name: 'PPI', votes: 387650, d: 18, inAnnex: true },
  { code: 'FFT', name: 'FFT', votes: 251973, d: 12, inAnnex: true },
  { code: 'NONS', name: 'Non-inscrits', votes: 639623, d: 9, inAnnex: false },
  { code: 'OTHER', name: 'Other', votes: 57388, d: 0, inAnnex: false }
])

const resultReady = ref(false)
const resultTable = ref([])
const errorMessage = ref('')

// Compute total votes from all parties
const totalVotes = computed(() => {
  return parties.reduce((sum, p) => sum + (Number.isFinite(p.votes) ? p.votes : 0), 0)
})

// Input Validation
const isValidInput = computed(() => {
  if (!Number.isFinite(params.S) || params.S < 1) return false
  if (!Number.isFinite(params.alpha) || params.alpha < 0 || params.alpha > 1) return false
  if (!Number.isFinite(params.t_annex) || params.t_annex < 0 || params.t_annex > 1) return false
  if (!Number.isFinite(params.small_cutoff) || params.small_cutoff < 0 || params.small_cutoff > 1) return false
  if (!Number.isFinite(params.b) || params.b < 0 || params.b > 1) return false
  if (totalVotes.value < 1) return false
  if (parties.length === 0) return false
  if (parties.some(p => !p.name || p.votes < 0 || p.d < 0 || !Number.isFinite(p.votes) || !Number.isFinite(p.d))) return false
  const totalDistrictSeats = parties.reduce((sum, p) => sum + p.d, 0)
  if (totalDistrictSeats > params.S) return false
  return true
})

function formatInt(n) {
  return Number.isFinite(n) ? n.toLocaleString() : '0'
}

function addParty() {
  parties.push({
    code: `NEW${parties.length + 1}`,
    name: 'NEW',
    votes: 100000,
    d: 0,
    inAnnex: true
  })
}

function removeParty(i) {
  parties.splice(i, 1)
}

function resetSample() {
  window.location.reload()
}

function hareEntitlement(votesArr, S) {
  const V = votesArr.reduce((a, b) => a + b, 0)
  if (V <= 0) throw new Error('Total votes must be positive')
  const Q = V / S
  const q = votesArr.map(v => Math.floor(v / Q))
  const remainders = votesArr.map((v, i) => (v / Q) - q[i])
  let R = S - q.reduce((a, b) => a + b, 0)
  const idxs = remainders.map((r, i) => ({ r, i })).sort((a, b) => b.r - a.r || votesArr[b.i] - votesArr[a.i])
  for (let k = 0; k < R && k < idxs.length; k++) {
    q[idxs[k].i] += 1
  }
  return q
}

function computeWeights(p) {
  if (p <= 0 || p >= 1) return 0
  return 1 / (p * (1 - p))
}

function roundVal(x, mode = 'nearest') {
  if (!Number.isFinite(x)) return 0
  if (mode === 'nearest') return Math.round(x)
  if (mode === 'ceil') return Math.ceil(x)
  return Math.floor(x)
}

function runSimulation() {
  errorMessage.value = ''
  resultReady.value = false
  try {
    // Validate inputs
    if (!isValidInput.value) {
      throw new Error('Invalid inputs: Ensure all values are valid, non-negative, and district seats do not exceed total seats.')
    }

    // Prepare arrays
    const S = params.S
    const C = Math.floor(params.alpha * S)
    const partiesCopy = parties.map(p => ({ ...p }))
    const V = totalVotes.value
    if (V <= 0) throw new Error('Total votes must be positive')
    partiesCopy.forEach(p => p.p = p.votes / V)

    // Compute entitlement via Hare
    const votesArr = partiesCopy.map(p => p.votes)
    const entArr = hareEntitlement(votesArr, S)
    partiesCopy.forEach((p, i) => p.e = entArr[i])

    // Baseline deficits
    partiesCopy.forEach(p => p.baseline = Math.max(0, p.e - p.d))

    // Eligible for annex
    partiesCopy.forEach(p => p.eligible = (p.p >= params.t_annex) && p.inAnnex)

    // Small parties set
    const smallSet = partiesCopy.filter(p => p.eligible && p.p < params.small_cutoff)
    const B_raw = smallSet.reduce((a, p) => a + (params.b * p.e), 0)

    // Inverse-variance weights
    const weights = smallSet.map(p => computeWeights(p.p))
    const wSum = weights.reduce((a, b) => a + b, 0) || 1
    const boosts = smallSet.map((p, i) => wSum > 0 ? B_raw * (weights[i] / wSum) : 0)

    // Attach boosts
    smallSet.forEach((p, i) => p.boost = boosts[i])
    partiesCopy.forEach(p => { if (!p.boost) p.boost = 0 })

    // Augmented deficits
    partiesCopy.forEach(p => p.aug = p.baseline + p.boost)
    partiesCopy.forEach(p => p.augRounded = roundVal(p.aug, global.roundMode))

    // Small-first allocation
    const smallDemands = partiesCopy
      .filter(p => p.eligible && p.p < params.small_cutoff)
      .map(p => ({ code: p.code, demand: p.augRounded, name: p.name, votes: p.votes }))
    const smallTotalDemand = smallDemands.reduce((a, b) => a + b.demand, 0)
    const allocation = partiesCopy.reduce((acc, p) => { acc[p.code] = 0; return acc }, {})

    if (smallTotalDemand >= C) {
      const base = smallDemands.map(s => ({ ...s, fraction: (s.demand / smallTotalDemand) * C }))
      base.forEach(b => b.floor = Math.floor(b.fraction))
      let used = base.reduce((a, b) => a + b.floor, 0)
      let rem = C - used
      base.forEach(b => b.remainder = b.fraction - b.floor)
      base.sort((a, b) => b.remainder - a.remainder || b.votes - a.votes)
      for (let i = 0; i < rem && i < base.length; i++) { base[i].floor += 1 }
      base.forEach(b => allocation[b.code] = b.floor)
    } else {
      smallDemands.forEach(s => allocation[s.code] = s.demand)
      let remaining = C - smallTotalDemand
      const largeList = partiesCopy
        .filter(p => p.eligible && !(p.p < params.small_cutoff) && p.augRounded > 0)
        .map(p => ({ code: p.code, demand: p.augRounded, votes: p.votes }))
      const totalLargeDemand = largeList.reduce((a, b) => a + b.demand, 0)
      if (totalLargeDemand > 0) {
        const frac = largeList.map(l => ({ ...l, fraction: (l.demand / totalLargeDemand) * remaining }))
        frac.forEach(f => f.floor = Math.floor(f.fraction))
        let used = frac.reduce((a, b) => a + b.floor, 0)
        let rem = remaining - used
        frac.forEach(f => f.remainder = f.fraction - f.floor)
        frac.sort((a, b) => b.remainder - a.remainder || b.votes - a.votes)
        for (let i = 0; i < rem && i < frac.length; i++) { frac[i].floor += 1 }
        frac.forEach(f => allocation[f.code] = f.floor)
      }
    }

    // Prepare result table
    resultTable.value = partiesCopy.map(p => ({
      code: p.code,
      name: p.name,
      v: p.votes,
      p: p.p,
      d: p.d,
      e: p.e,
      baseline: p.baseline,
      boost: p.boost || 0,
      aug: p.aug || 0,
      a: allocation[p.code] || 0,
      total: p.d + (allocation[p.code] || 0)
    }))
    resultReady.value = true
  } catch (err) {
    errorMessage.value = err.message || 'An error occurred during the simulation.'
  }
}

const __returned__ = { params, global, parties, resultReady, resultTable, errorMessage, totalVotes, isValidInput, formatInt, addParty, removeParty, resetSample, hareEntitlement, computeWeights, roundVal, runSimulation, reactive, ref, computed }
Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true })
return __returned__
}

};
import { createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock, vModelText as _vModelText, withDirectives as _withDirectives, vModelSelect as _vModelSelect, renderList as _renderList, Fragment as _Fragment, vModelCheckbox as _vModelCheckbox, createStaticVNode as _createStaticVNode } from "vue"

const _hoisted_1 = { class: "p-4 max-w-5xl mx-auto font-sans" }
const _hoisted_2 = {
  key: 0,
  class: "mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded"
}
const _hoisted_3 = { class: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" }
const _hoisted_4 = { class: "p-3 border rounded" }
const _hoisted_5 = { class: "block text-sm" }
const _hoisted_6 = { class: "block text-sm mt-2" }
const _hoisted_7 = { class: "block text-sm mt-2" }
const _hoisted_8 = { class: "block text-sm mt-2" }
const _hoisted_9 = { class: "block text-sm mt-2" }
const _hoisted_10 = { class: "p-3 border rounded" }
const _hoisted_11 = { class: "block text-sm" }
const _hoisted_12 = ["value"]
const _hoisted_13 = { class: "block text-sm mt-2" }
const _hoisted_14 = { class: "mt-4" }
const _hoisted_15 = ["disabled"]
const _hoisted_16 = { class: "mb-4" }
const _hoisted_17 = { class: "w-full text-sm border-collapse" }
const _hoisted_18 = { class: "py-2" }
const _hoisted_19 = ["onUpdate:modelValue"]
const _hoisted_20 = ["onUpdate:modelValue"]
const _hoisted_21 = ["onUpdate:modelValue"]
const _hoisted_22 = ["onUpdate:modelValue"]
const _hoisted_23 = { class: "text-right" }
const _hoisted_24 = ["onClick"]
const _hoisted_25 = { key: 1 }
const _hoisted_26 = { class: "overflow-auto border rounded p-2" }
const _hoisted_27 = { class: "w-full text-sm border-collapse" }
function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _cache[25] || (_cache[25] = _createStaticVNode(" ㅤ__________________________________________________________________________________________________________ <h1 class=\"text-2xl font-bold mb-3\" data-v-7ba5bd90>Annex Apportionment: Luzhek Method Simulator</h1><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90><strong data-v-7ba5bd90>nnex Apportionment using Luzhek Method</strong> — A seat apportionment simulator for non-voting seats of a legislative chamber. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> For use in nations with a Split-Chamber System. Wherein a chamber is split into voting (Deliberative) and non-voting (Annex) seats, and wherein said Annex seats are apportioned [quasi-]proportionally to avoid raising the seat cieling of the main chamber. (Also to compleletely avoid proportionality in the main chamber) </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90><strong data-v-7ba5bd90><span style=\"text-decoration:underline;\" data-v-7ba5bd90>Fun Fact</span></strong>: This system originated, and is only present, in <strong data-v-7ba5bd90>Tschabelia</strong> | <strong data-v-7ba5bd90><a href=\"https://www.nationstates.net/nation=tschabelia\" target=\"_blank\" class=\"text-blue-600 hover:underline\" data-v-7ba5bd90>Tschabelia on NationStates.net</a></strong>. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90><strong data-v-7ba5bd90>Instructions:</strong> All fields must be non-negative. Percentages must be in decimal form (e.g. 0.15 = 15%). </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> • In <span style=\"text-decoration:underline;\" data-v-7ba5bd90>Parameters</span>: </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> ㅤ◦ Enter the total seat count of the voting section of your chamber. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> ㅤ◦ Enter a percentage to set the maximum number of seats in the annex by using total Deliberative seats as a base to multiply by. Fractions will always be <span style=\"text-decoration:underline;\" data-v-7ba5bd90>rounded down</span>. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> ㅤ◦ Enter the <span style=\"text-decoration:underline;\" data-v-7ba5bd90>minimum</span> vote share allowed for eligibilty in the Annex. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> ㅤ◦ Enter the vote share [percentage] threshold, above which parties are no longer considered &quot;small&quot; and not eligible for a &quot;boost&quot;. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> ㅤ◦ Enter the amount by which you wish to boost small parties by. (Keep in mind that the program still needs to apportion on a small first basis; this parameter wont always be reflected to its full potential) </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> • In <span style=\"text-decoration:underline;\" data-v-7ba5bd90>Global</span>: </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> ㅤ◦ The total voter turnout box offers no output. It&#39;s just a display. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> ㅤ◦ Choose your preferred rounding mode when caluclating Annex seat amounts. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> • In <span style=\"text-decoration:underline;\" data-v-7ba5bd90>Parties</span>: </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> ㅤ◦ Remove sample party data. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> ㅤ◦ Customize to your preferences. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> ㅤ◦ Check/Uncheck boxes to decide if that party gets representation in the Annex. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> • When you&#39;re finished click <strong data-v-7ba5bd90>Run</strong>. </p><p class=\"mb-4 text-sm text-gray-700\" data-v-7ba5bd90> Sample data is from Tschabelia&#39;s 2020 Chamber of Deputies Election </p>", 21)),
    _createCommentVNode(" Error Message "),
    ($setup.errorMessage)
      ? (_openBlock(), _createElementBlock("div", _hoisted_2, _toDisplayString($setup.errorMessage), 1 /* TEXT */))
      : _createCommentVNode("v-if", true),
    _createElementVNode("div", _hoisted_3, [
      _createCommentVNode(" Parameters Panel "),
      _createElementVNode("div", _hoisted_4, [
        _cache[11] || (_cache[11] = _createElementVNode("h2", { class: "font-semibold mb-2" }, "Parameters", -1 /* CACHED */)),
        _createElementVNode("label", _hoisted_5, [
          _cache[6] || (_cache[6] = _createTextVNode("Deliberative seats ", -1 /* CACHED */)),
          _withDirectives(_createElementVNode("input", {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => (($setup.params.S) = $event)),
            type: "number",
            min: "1",
            class: "w-full mt-1 p-1 border rounded"
          }, null, 512 /* NEED_PATCH */), [
            [
              _vModelText,
              $setup.params.S,
              void 0,
              { number: true }
            ]
          ])
        ]),
        _createElementVNode("label", _hoisted_6, [
          _cache[7] || (_cache[7] = _createTextVNode("ㅤAnnex cap (%) ", -1 /* CACHED */)),
          _withDirectives(_createElementVNode("input", {
            "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => (($setup.params.alpha) = $event)),
            type: "number",
            step: "0.01",
            min: "0",
            max: "1",
            class: "w-full mt-1 p-1 border rounded"
          }, null, 512 /* NEED_PATCH */), [
            [
              _vModelText,
              $setup.params.alpha,
              void 0,
              { number: true }
            ]
          ])
        ]),
        _createElementVNode("label", _hoisted_7, [
          _cache[8] || (_cache[8] = _createTextVNode("ㅤAnnex threshold (%) ", -1 /* CACHED */)),
          _withDirectives(_createElementVNode("input", {
            "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => (($setup.params.t_annex) = $event)),
            type: "number",
            step: "0.001",
            min: "0",
            max: "1",
            class: "w-full mt-1 p-1 border rounded"
          }, null, 512 /* NEED_PATCH */), [
            [
              _vModelText,
              $setup.params.t_annex,
              void 0,
              { number: true }
            ]
          ])
        ]),
        _createElementVNode("label", _hoisted_8, [
          _cache[9] || (_cache[9] = _createTextVNode("ㅤSmall-party cutoff (%) ", -1 /* CACHED */)),
          _withDirectives(_createElementVNode("input", {
            "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => (($setup.params.small_cutoff) = $event)),
            type: "number",
            step: "0.01",
            min: "0",
            max: "1",
            class: "w-full mt-1 p-1 border rounded"
          }, null, 512 /* NEED_PATCH */), [
            [
              _vModelText,
              $setup.params.small_cutoff,
              void 0,
              { number: true }
            ]
          ])
        ]),
        _createElementVNode("label", _hoisted_9, [
          _cache[10] || (_cache[10] = _createTextVNode("ㅤSmall party boost (%) ", -1 /* CACHED */)),
          _withDirectives(_createElementVNode("input", {
            "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => (($setup.params.b) = $event)),
            type: "number",
            step: "0.01",
            min: "0",
            max: "1",
            class: "w-full mt-1 p-1 border rounded"
          }, null, 512 /* NEED_PATCH */), [
            [
              _vModelText,
              $setup.params.b,
              void 0,
              { number: true }
            ]
          ])
        ])
      ]),
      _createCommentVNode(" Global Settings Panel "),
      _createElementVNode("div", _hoisted_10, [
        _cache[16] || (_cache[16] = _createElementVNode("h2", { class: "font-semibold mb-2" }, "Global", -1 /* CACHED */)),
        _createElementVNode("label", _hoisted_11, [
          _cache[12] || (_cache[12] = _createTextVNode("Total voter turnout (auto-calculated from table) ", -1 /* CACHED */)),
          _createElementVNode("input", {
            value: $setup.totalVotes,
            type: "number",
            readonly: "",
            class: "w-full mt-1 p-1 border rounded bg-gray-100"
          }, null, 8 /* PROPS */, _hoisted_12)
        ]),
        _createElementVNode("label", _hoisted_13, [
          _cache[14] || (_cache[14] = _createTextVNode("ㅤRounding mode ", -1 /* CACHED */)),
          _withDirectives(_createElementVNode("select", {
            "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => (($setup.global.roundMode) = $event)),
            class: "w-full mt-1 p-1 border rounded"
          }, [...(_cache[13] || (_cache[13] = [
            _createElementVNode("option", { value: "nearest" }, "Nearest (.5 to even)", -1 /* CACHED */),
            _createElementVNode("option", { value: "ceil" }, "Ceil", -1 /* CACHED */),
            _createElementVNode("option", { value: "floor" }, "Floor", -1 /* CACHED */)
          ]))], 512 /* NEED_PATCH */), [
            [_vModelSelect, $setup.global.roundMode]
          ])
        ]),
        _createElementVNode("div", _hoisted_14, [
          _createElementVNode("button", {
            onClick: $setup.runSimulation,
            class: "px-3 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400",
            disabled: !$setup.isValidInput
          }, "Run", 8 /* PROPS */, _hoisted_15),
          _cache[15] || (_cache[15] = _createTextVNode(" ㅤ ", -1 /* CACHED */)),
          _createElementVNode("button", {
            onClick: $setup.resetSample,
            class: "ml-2 px-3 py-2 border rounded"
          }, "Reset to sample data")
        ])
      ])
    ]),
    _createCommentVNode(" Parties Table "),
    _createElementVNode("div", _hoisted_16, [
      _cache[18] || (_cache[18] = _createElementVNode("h2", { class: "font-semibold mb-2" }, "Parties", -1 /* CACHED */)),
      _createElementVNode("table", _hoisted_17, [
        _cache[17] || (_cache[17] = _createElementVNode("thead", null, [
          _createElementVNode("tr", { class: "text-left border-b" }, [
            _createElementVNode("th", null, "Name"),
            _createElementVNode("th", null, "Votes (or est share)"),
            _createElementVNode("th", null, "District seats d_i"),
            _createElementVNode("th", null, "Eligible for Annex"),
            _createElementVNode("th")
          ])
        ], -1 /* CACHED */)),
        _createElementVNode("tbody", null, [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList($setup.parties, (p, idx) => {
            return (_openBlock(), _createElementBlock("tr", {
              key: p.code,
              class: "border-b"
            }, [
              _createElementVNode("td", _hoisted_18, [
                _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((p.name) = $event),
                  class: "p-1 border rounded w-full",
                  placeholder: "Party name"
                }, null, 8 /* PROPS */, _hoisted_19), [
                  [_vModelText, p.name]
                ])
              ]),
              _createElementVNode("td", null, [
                _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((p.votes) = $event),
                  type: "number",
                  min: "0",
                  class: "p-1 border rounded w-full"
                }, null, 8 /* PROPS */, _hoisted_20), [
                  [
                    _vModelText,
                    p.votes,
                    void 0,
                    { number: true }
                  ]
                ])
              ]),
              _createElementVNode("td", null, [
                _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((p.d) = $event),
                  type: "number",
                  min: "0",
                  class: "p-1 border rounded w-full"
                }, null, 8 /* PROPS */, _hoisted_21), [
                  [
                    _vModelText,
                    p.d,
                    void 0,
                    { number: true }
                  ]
                ])
              ]),
              _createElementVNode("td", null, [
                _withDirectives(_createElementVNode("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": $event => ((p.inAnnex) = $event)
                }, null, 8 /* PROPS */, _hoisted_22), [
                  [_vModelCheckbox, p.inAnnex]
                ])
              ]),
              _createElementVNode("td", _hoisted_23, [
                _createElementVNode("button", {
                  onClick: $event => ($setup.removeParty(idx)),
                  class: "text-red-600"
                }, "Remove", 8 /* PROPS */, _hoisted_24)
              ])
            ]))
          }), 128 /* KEYED_FRAGMENT */))
        ])
      ]),
      _createElementVNode("div", { class: "mt-2" }, [
        _createElementVNode("button", {
          onClick: $setup.addParty,
          class: "px-2 py-1 border rounded"
        }, "Add party")
      ])
    ]),
    _createCommentVNode(" Results Section "),
    ($setup.resultReady)
      ? (_openBlock(), _createElementBlock("div", _hoisted_25, [
          _cache[20] || (_cache[20] = _createElementVNode("h2", { class: "text-lg font-semibold mb-2" }, "Results", -1 /* CACHED */)),
          _createElementVNode("div", _hoisted_26, [
            _createElementVNode("table", _hoisted_27, [
              _cache[19] || (_cache[19] = _createElementVNode("thead", null, [
                _createElementVNode("tr", { class: "text-left border-b" }, [
                  _createElementVNode("th", null, "Party"),
                  _createElementVNode("th", null, "Votes"),
                  _createElementVNode("th", null, "%"),
                  _createElementVNode("th", null, "Seats"),
                  _createElementVNode("th", null, "Entitlement"),
                  _createElementVNode("th", null, " Baseline Difference"),
                  _createElementVNode("th", null, "Boost"),
                  _createElementVNode("th", null, "Augment."),
                  _createElementVNode("th", null, "Annex Seats"),
                  _createElementVNode("th", null, "Total")
                ])
              ], -1 /* CACHED */)),
              _createElementVNode("tbody", null, [
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList($setup.resultTable, (row) => {
                  return (_openBlock(), _createElementBlock("tr", {
                    key: row.code,
                    class: "border-b hover:bg-gray-50"
                  }, [
                    _createElementVNode("td", null, _toDisplayString(row.name), 1 /* TEXT */),
                    _createElementVNode("td", null, _toDisplayString($setup.formatInt(row.v)), 1 /* TEXT */),
                    _createElementVNode("td", null, _toDisplayString((row.p * 100).toFixed(2)) + "%", 1 /* TEXT */),
                    _createElementVNode("td", null, _toDisplayString(row.d), 1 /* TEXT */),
                    _createElementVNode("td", null, _toDisplayString(row.e), 1 /* TEXT */),
                    _createElementVNode("td", null, _toDisplayString(row.baseline), 1 /* TEXT */),
                    _createElementVNode("td", null, _toDisplayString(row.boost.toFixed(3)), 1 /* TEXT */),
                    _createElementVNode("td", null, _toDisplayString(row.aug.toFixed(3)), 1 /* TEXT */),
                    _createElementVNode("td", null, _toDisplayString(row.a), 1 /* TEXT */),
                    _createElementVNode("td", null, _toDisplayString(row.total), 1 /* TEXT */)
                  ]))
                }), 128 /* KEYED_FRAGMENT */))
              ])
            ])
          ]),
          _cache[21] || (_cache[21] = _createElementVNode("p", { class: "mb-4 text-sm text-gray-700" }, " ㅤㅤㅤ ", -1 /* CACHED */)),
          _cache[22] || (_cache[22] = _createElementVNode("p", { class: "mb-4 text-sm text-gray-700" }, [
            _createElementVNode("strong", null, "Seats"),
            _createTextVNode(" = Voting seats/MPs ")
          ], -1 /* CACHED */)),
          _cache[23] || (_cache[23] = _createElementVNode("p", { class: "mb-4 text-sm text-gray-700" }, [
            _createElementVNode("strong", null, "Annex Seats"),
            _createTextVNode(" = Non-Voting seats/MPs in annex ")
          ], -1 /* CACHED */)),
          _cache[24] || (_cache[24] = _createElementVNode("p", { class: "mb-4 text-sm text-gray-700" }, " ㅤㅤㅤ ", -1 /* CACHED */))
        ]))
      : _createCommentVNode("v-if", true)
  ]))
}
__sfc__.render = render
__sfc__.__scopeId = "data-v-7ba5bd90"
__sfc__.__file = "src/App.vue"
export default __sfc__
