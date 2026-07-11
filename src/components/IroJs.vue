<template>
  <div id="colorPicker" class="row"></div>
</template>

<script>
import iro from '@jaames/iro'

export default {
  mounted() {
    const root = document.body

    const colorPicker = new iro.ColorPicker('#colorPicker', {
      color: localStorage.getItem('theme-color') || '#151e15',
      borderWidth: 1,
      borderColor: "#fff",
      layout: [
        {
          component: iro.ui.Box,
        },
        {
          component: iro.ui.Slider,
          options: {
            id: 'hue-slider',
            sliderType: 'hue'
          }
        }
      ]
    })

    colorPicker.on(['color:init', 'input:change'], (color) => {
      root.style.setProperty('--theme-color', color.hexString)

      document.querySelectorAll('.theme-color').forEach((element) => {
        element.content = color.hexString
      })

      root.classList.toggle('light', color.hsl.l >= 45)

      localStorage.setItem('theme-color', color.hexString)
    })
  }
}
</script>
