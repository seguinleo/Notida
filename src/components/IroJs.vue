<template>
  {{ colorHex }}
  <div class="row">
    <div id="color-picker"></div>
  </div>
  <div class="row">
    <button type="button" class="btn-danger w-100" @click="resetTheme()">Reset</button>
  </div>
</template>

<script>
import iro from '@jaames/iro'

const DEFAULT_COLOR = '#151e15'

export default {
  data() {
    return {
      colorPicker: null,
      colorHex: DEFAULT_COLOR
    }
  },
  mounted() {
    const root = document.body

    this.colorPicker = new iro.ColorPicker('#color-picker', {
      color: localStorage.getItem('theme-color') || DEFAULT_COLOR,
      borderWidth: 2,
      borderColor: '#fff',
      layout: [
        {
          component: iro.ui.Box,
        },
        {
          component: iro.ui.Slider,
          options: {
            id: 'hue-slider',
            sliderType: 'hue',
          },
        },
      ],
    })

    this.colorPicker.on(['color:init', 'color:change'], (color) => {
      this.colorHex = color.hexString

      root.style.setProperty('--theme-color', color.hexString)

      document.querySelectorAll('.theme-color').forEach((element) => {
        element.content = color.hexString
      })

      root.classList.toggle('light', color.hsl.l >= 45)

      if (color.hexString === DEFAULT_COLOR) {
        localStorage.removeItem('theme-color')
      } else {
        localStorage.setItem('theme-color', color.hexString)
      }
    })
  },
  methods: {
    resetTheme() {
      localStorage.removeItem('theme-color')
      this.colorPicker.color.set(DEFAULT_COLOR)
    },
  },
}
</script>
