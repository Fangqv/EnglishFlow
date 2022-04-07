// Just like a web crawler~

document.addEventListener('keypress', ev => {
  if (ev.shiftKey && !ev.altKey && !ev.ctrlKey) {
    if (ev.key === 'W') {
      const map: { [key: string]: number } = {}
      document.querySelectorAll('.TKwHGb').forEach(e => {
        const t = e.querySelector('.kgnlhe')?.innerHTML
        const f = e.querySelectorAll('.ksE5nf.EiZ8Dd').length
        // console.log(t, f)
        if (t) {
          const F = map[t]
          if (F) {
            map[t] += f
          } else {
            map[t] = f
          }
        }
      })

      console.log(map)

      let exist_3 = false
      Object.keys(map).forEach(k => {
        if (map[k] >= 3) {
          exist_3 = true
        }
      })

      //       var sortable = [];
      // for (var vehicle in maxSpeed) {
      //     sortable.push([vehicle, maxSpeed[vehicle]]);
      // }

      // sortable.sort(function(a, b) {
      //     return a[1] - b[1];
      // });

      let orderedKeyValue: any[] = []

      for (const key in map) {
        if (Object.prototype.hasOwnProperty.call(map, key)) {
          const frequence = map[key]
          orderedKeyValue.push([key, frequence])
        }
      }

      orderedKeyValue.sort((a, b) => {
        return b[1] - a[1]
      })

      const cuttedMap = orderedKeyValue.filter(v => {
        if (orderedKeyValue.length < 5) {
          return true
        }
        if (exist_3) {
          if (v[1] === 1) {
            return false
          }
        }
        return true
      })

      console.log(cuttedMap)
      const cuttedKeys = cuttedMap.map(v => v[0])
      GM_setClipboard(cuttedKeys.join('|'))
    }
  }
})
