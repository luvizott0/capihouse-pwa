<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Post } from '@/types/models'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import { getInitials } from '@/utils/initials'

const props = defineProps<{
  modelValue: boolean
  post: Post
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

type CardFormat = 'story' | 'square'

const currentFormat = ref<CardFormat>('story')
const isRendering = ref(false)
const previewUrl = ref<string>('')
const shareError = ref('')
const shareSuccess = ref(false)

import { parseRecapData } from '@/utils/recap'

const recap = computed(() => parseRecapData(props.post))
const targetUser = computed(() => recap.value.targetUser)
const monthYear = computed(() => recap.value.monthYear)
const emojiJourney = computed(() => recap.value.emojiJourney)
const podium = computed(() => recap.value.podium)

// Função auxiliar para desenhar retângulos arredondados no Canvas
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth: number = 1
) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()

  if (fillColor) {
    ctx.fillStyle = fillColor
    ctx.fill()
  }

  if (strokeColor) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
  ctx.restore()
}

// Carregar avatar de forma assíncrona com fallback
function loadAvatarImage(url: string | null | undefined): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// Renderizar o card no Canvas
async function renderCard(): Promise<HTMLCanvasElement> {
  isRendering.value = true
  const isStory = currentFormat.value === 'story'
  const width = 1080
  const height = isStory ? 1920 : 1080

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    isRendering.value = false
    throw new Error('Não foi possível inicializar o contexto 2D do Canvas')
  }

  // 1. Fundo Texturizado Retro (Parchment/Linho acolhedor)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, '#FAF5ED')
  bgGrad.addColorStop(0.5, '#F5EDE1')
  bgGrad.addColorStop(1, '#EFE4D4')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // 2. Bordas Retrô com Moldura Dupla
  // Borda externa
  roundRect(ctx, 30, 30, width - 60, height - 60, 24, undefined, '#7D4720', 8)
  // Borda interna fina
  roundRect(ctx, 48, 48, width - 96, height - 96, 16, undefined, '#D4A373', 3)

  // Cantos decorativos vintage
  const drawCornerAccent = (cx: number, cy: number) => {
    ctx.save()
    ctx.fillStyle = '#7D4720'
    ctx.fillRect(cx - 8, cy - 8, 16, 16)
    ctx.restore()
  }
  drawCornerAccent(48, 48)
  drawCornerAccent(width - 48, 48)
  drawCornerAccent(48, height - 48)
  drawCornerAccent(width - 48, height - 48)

  // 3. Cabeçalho / Branding CapiHouse
  const headerY = isStory ? 150 : 120
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Tag superior
  roundRect(ctx, width / 2 - 260, headerY - 50, 520, 48, 8, '#7D4720')
  ctx.fillStyle = '#FAF5ED'
  ctx.font = 'bold 22px "Space Mono", monospace'
  ctx.fillText('🐾 CAPIHOUSE • RECAP', width / 2, headerY - 26)

  // Título do Mês
  ctx.fillStyle = '#7D4720'
  ctx.font = '900 48px "Space Mono", sans-serif'
  ctx.fillText('RECAP DE SENTIMENTOS', width / 2, headerY + 40)

  // Subtítulo Mês / Ano
  ctx.fillStyle = '#A66130'
  ctx.font = 'bold 28px "Space Mono", monospace'
  ctx.fillText(`• ${monthYear.value.full} •`, width / 2, headerY + 90)
  ctx.restore()

  // 4. Cartão de Identificação do Usuário
  const userBoxY = isStory ? 320 : 255
  const userBoxHeight = isStory ? 190 : 155
  const userBoxWidth = width - 160
  const userBoxX = 80

  roundRect(ctx, userBoxX, userBoxY, userBoxWidth, userBoxHeight, 20, '#FFFFFF', '#E2D3C0', 2)

  // Carregar e desenhar Avatar
  const user = targetUser.value
  const avatarImg = await loadAvatarImage(user.avatar_url)
  const avatarSize = isStory ? 110 : 95
  const avatarX = userBoxX + 40
  const avatarY = userBoxY + (userBoxHeight - avatarSize) / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  if (avatarImg) {
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize)
  } else {
    // Avatar com iniciais em caso de ausência de foto
    ctx.fillStyle = '#A66130'
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize)
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 44px "Space Mono", monospace'
    ctx.fillText(getInitials(user.name), avatarX + avatarSize / 2, avatarY + avatarSize / 2)
  }
  ctx.restore()

  // Borda ao redor do avatar
  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
  ctx.strokeStyle = '#7D4720'
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.restore()

  // Nome e @username do usuário
  ctx.save()
  ctx.textAlign = 'left'
  const textLeft = avatarX + avatarSize + 35
  const textCenterY = userBoxY + userBoxHeight / 2

  ctx.fillStyle = '#2D1F17'
  ctx.font = 'bold 36px "Space Mono", sans-serif'
  ctx.fillText(user.name, textLeft, textCenterY - 18, userBoxWidth - avatarSize - 80)

  ctx.fillStyle = '#A66130'
  ctx.font = 'bold 26px "Space Mono", monospace'
  ctx.fillText(`@${user.username}`, textLeft, textCenterY + 24)
  ctx.restore()

  // 5. Seção 1: Jornada de Sentimentos (Nuvem/Mosaico de Emojis)
  const journeyY = isStory ? 550 : 445
  const journeyWidth = width - 160
  const journeyX = 80
  const journeyHeight = isStory ? 480 : 250

  roundRect(ctx, journeyX, journeyY, journeyWidth, journeyHeight, 20, '#FFFDF9', '#E2D3C0', 2)

  // Título da seção
  ctx.save()
  ctx.textAlign = 'left'
  ctx.fillStyle = '#7D4720'
  ctx.font = 'bold 24px "Space Mono", monospace'
  ctx.fillText('📜 JORNADA DE SENTIMENTOS NO MÊS', journeyX + 35, journeyY + 45)

  // Divisória sutil
  ctx.strokeStyle = '#EFE4D4'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(journeyX + 35, journeyY + 65)
  ctx.lineTo(journeyX + journeyWidth - 35, journeyY + 65)
  ctx.stroke()
  ctx.restore()

  // Desenho dos emojis em fluxo contínuo
  const emojis = emojiJourney.value
  const emojiAreaX = journeyX + 35
  const emojiAreaY = journeyY + 115
  const emojiAreaWidth = journeyWidth - 70

  const emojiFontSize = isStory ? 44 : 36
  const emojiSpacing = isStory ? 60 : 48
  const rowHeight = isStory ? 68 : 52

  ctx.save()
  ctx.font = `${emojiFontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let curX = emojiAreaX + emojiSpacing / 2
  let curY = emojiAreaY

  const maxRows = isStory ? 5 : 3
  let currentRow = 0

  for (let i = 0; i < emojis.length; i++) {
    const emoji = emojis[i]
    if (!emoji) continue

    if (curX + emojiSpacing / 2 > emojiAreaX + emojiAreaWidth) {
      curX = emojiAreaX + emojiSpacing / 2
      curY += rowHeight
      currentRow++
      if (currentRow >= maxRows) break
    }
    ctx.fillText(emoji, curX, curY)
    curX += emojiSpacing
  }
  ctx.restore()

  // 6. Seção 2: Pódio dos Sentimentos Mais Frequentes (Top 3)
  const podiumY = isStory ? 1070 : 725
  const podiumWidth = width - 160
  const podiumX = 80
  const podiumHeight = isStory ? 620 : 270

  roundRect(ctx, podiumX, podiumY, podiumWidth, podiumHeight, 20, '#FFFDF9', '#E2D3C0', 2)

  // Título da seção
  ctx.save()
  ctx.textAlign = 'left'
  ctx.fillStyle = '#7D4720'
  ctx.font = 'bold 24px "Space Mono", monospace'
  ctx.fillText('🏆 SENTIMENTOS MAIS FREQUENTES', podiumX + 35, podiumY + 45)

  // Divisória sutil
  ctx.strokeStyle = '#EFE4D4'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(podiumX + 35, podiumY + 65)
  ctx.lineTo(podiumX + podiumWidth - 35, podiumY + 65)
  ctx.stroke()
  ctx.restore()

  // Renderizar os 3 itens do pódio
  const podiumItems = podium.value
  const podiumColors = [
    { bg: '#FEF3C7', border: '#F59E0B', medal: '🥇' }, // Ouro
    { bg: '#F1F5F9', border: '#94A3B8', medal: '🥈' }, // Prata
    { bg: '#FFEDD5', border: '#F97316', medal: '🥉' }, // Bronze
  ]

  if (isStory) {
    // No formato Story (vertical), desenha 3 barras horizontais largas
    const itemHeight = 125
    const itemSpacing = 28
    const itemsStartY = podiumY + 105

    for (let i = 0; i < Math.min(podiumItems.length, 3); i++) {
      const item = podiumItems[i]
      const color = podiumColors[i]
      if (!item || !color) continue

      const itemY = itemsStartY + i * (itemHeight + itemSpacing)
      const itemX = podiumX + 35
      const itW = podiumWidth - 70

      roundRect(ctx, itemX, itemY, itW, itemHeight, 16, color.bg, color.border, 2)

      ctx.save()
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'

      // Medalha
      ctx.font = '54px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
      ctx.fillText(item.medal, itemX + 30, itemY + itemHeight / 2)

      // Emoji
      ctx.font = '58px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
      ctx.fillText(item.emoji, itemX + 115, itemY + itemHeight / 2)

      // Palavra(s) do sentimento associada
      if (item.name) {
        ctx.fillStyle = '#7D4720'
        ctx.font = 'bold 32px "Space Mono", monospace'
        ctx.fillText(item.name, itemX + 195, itemY + itemHeight / 2)
      }

      // Contagem
      ctx.textAlign = 'right'
      ctx.fillStyle = '#7D4720'
      ctx.font = 'bold 36px "Space Mono", monospace'
      ctx.fillText(`${item.count}`, itemX + itW - 35, itemY + itemHeight / 2)
      ctx.restore()
    }
  } else {
    // No formato Quadrado (compacto), desenha 3 colunas/cards lado a lado
    const colWidth = (podiumWidth - 70 - 40) / 3
    const colHeight = 145
    const colY = podiumY + 95

    for (let i = 0; i < Math.min(podiumItems.length, 3); i++) {
      const item = podiumItems[i]
      const color = podiumColors[i]
      if (!item || !color) continue

      const colX = podiumX + 35 + i * (colWidth + 20)

      roundRect(ctx, colX, colY, colWidth, colHeight, 14, color.bg, color.border, 2)

      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Medalha e Emoji juntos
      ctx.font = '36px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
      ctx.fillText(`${item.medal} ${item.emoji}`, colX + colWidth / 2, colY + 36)

      // Palavra(s) do sentimento associada
      if (item.name) {
        ctx.fillStyle = '#7D4720'
        ctx.font = 'bold 19px "Space Mono", monospace'
        ctx.fillText(item.name, colX + colWidth / 2, colY + 76, colWidth - 16)
      }

      // Contagem
      ctx.fillStyle = '#7D4720'
      ctx.font = 'bold 22px "Space Mono", monospace'
      ctx.fillText(`${item.count}`, colX + colWidth / 2, colY + 116)
      ctx.restore()
    }
  }

  // 7. Detalhe final decorativo minimalista com patinha (sem os textos removidos a pedido)
  const footerY = isStory ? height - 90 : height - 65
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#B08865'
  ctx.font = '22px "Space Mono", monospace'
  ctx.fillText('• 🐾 •', width / 2, footerY)
  ctx.restore()

  isRendering.value = false
  return canvas
}

// Atualizar imagem de pré-visualização
async function updatePreview() {
  try {
    const canvas = await renderCard()
    previewUrl.value = canvas.toDataURL('image/png')
  } catch (err) {
    console.error('Falha ao gerar pré-visualização do card:', err)
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      nextTick(() => {
        updatePreview()
      })
    }
  }
)

watch(currentFormat, () => {
  updatePreview()
})

// Gerar Blob para download ou compartilhamento
async function getCardBlob(): Promise<Blob> {
  const canvas = await renderCard()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Falha ao exportar imagem'))
    }, 'image/png')
  })
}

// ⬇️ Ação: Baixar Imagem (Download Direto)
async function downloadImage() {
  try {
    const blob = await getCardBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const user = targetUser.value
    const safeUsername = user.username.replace(/[^a-zA-Z0-9_-]/g, '')
    a.download = `recap-sentimentos-${safeUsername}-${monthYear.value.month.toLowerCase()}-${currentFormat.value}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    shareSuccess.value = true
    setTimeout(() => {
      shareSuccess.value = false
    }, 3000)
  } catch (err) {
    console.error('Erro ao baixar card:', err)
    shareError.value = 'Falha ao baixar imagem.'
  }
}

// 📲 Ação: Compartilhar no Celular (Web Share API)
async function shareImage() {
  shareError.value = ''
  try {
    const blob = await getCardBlob()
    const filename = `recap-sentimentos-${monthYear.value.month.toLowerCase()}.png`
    const file = new File([blob], filename, { type: 'image/png' })

    // Se o dispositivo suporta compartilhamento de arquivos nativo (iOS / Android)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      const user = targetUser.value
      await navigator.share({
        title: `Recap de Sentimentos — ${user.name}`,
        files: [file],
      })
      shareSuccess.value = true
      setTimeout(() => {
        shareSuccess.value = false
      }, 3000)
    } else {
      // Fallback para dispositivos sem suporte ou desktop: baixa o arquivo
      await downloadImage()
    }
  } catch (err: any) {
    // Ignora se o usuário cancelou o menu nativo de compartilhamento
    if (err?.name !== 'AbortError') {
      console.error('Erro ao compartilhar:', err)
      // Tentar download direto como fallback seguro
      await downloadImage()
    }
  }
}
</script>

<template>
  <RetroModal
    :model-value="modelValue"
    title="🖼️ Card de Sentimentos da Rogéria"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="recap-modal-container">
      <!-- Seletor de Formato -->
      <div class="format-toggle-bar">
        <span class="toggle-label">Formato:</span>
        <div class="toggle-buttons">
          <button
            type="button"
            class="format-btn"
            :class="{ active: currentFormat === 'story' }"
            @click="currentFormat = 'story'"
          >
            📱 Story (9:16)
          </button>
          <button
            type="button"
            class="format-btn"
            :class="{ active: currentFormat === 'square' }"
            @click="currentFormat = 'square'"
          >
            🟦 Quadrado (1:1)
          </button>
        </div>
      </div>

      <!-- Área de Pré-Visualização -->
      <div class="card-preview-wrapper" :class="`is-${currentFormat}`">
        <div v-if="isRendering" class="rendering-overlay">
          <span class="spinner">🐾</span>
          <p>Preparando seu card com carinho...</p>
        </div>
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt="Pré-visualização do Card de Sentimentos"
          class="card-preview-img"
        />
      </div>

      <!-- Feedback de Sucesso / Erro -->
      <div v-if="shareSuccess" class="share-feedback success">
        ✨ Imagem pronta e salva com sucesso!
      </div>
      <div v-if="shareError" class="share-feedback error">
        ⚠️ {{ shareError }}
      </div>
    </div>

    <!-- Rodapé de Ações -->
    <template #footer>
      <div class="modal-actions-footer">
        <RetroButton
          variant="secondary"
          size="md"
          @click="downloadImage"
        >
          ⬇️ Baixar Imagem (PNG)
        </RetroButton>

        <RetroButton
          variant="primary"
          size="md"
          @click="shareImage"
        >
          📲 Compartilhar no Celular
        </RetroButton>
      </div>
    </template>
  </RetroModal>
</template>

<style scoped>
.recap-modal-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.format-toggle-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-heading, monospace);
  font-size: 0.85rem;
  font-weight: bold;
}

.toggle-label {
  color: var(--color-primary-800, #7d4720);
}

.toggle-buttons {
  display: flex;
  gap: 0.5rem;
  background-color: var(--color-primary-100, #f8efe6);
  padding: 0.25rem;
  border-radius: 4px;
  border: 1px solid var(--color-primary-300, #d9aa7d);
}

.format-btn {
  background: none;
  border: none;
  padding: 0.4rem 0.8rem;
  font-family: var(--font-heading, monospace);
  font-size: 0.82rem;
  font-weight: bold;
  color: var(--color-primary-700, #7d5628);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.15s ease;
}

.format-btn.active {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.card-preview-wrapper {
  position: relative;
  width: 100%;
  max-width: 380px;
  max-height: 52vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--color-border, #d9aa7d);
}

.card-preview-wrapper.is-square {
  max-width: 360px;
}

.card-preview-img {
  width: 100%;
  height: auto;
  max-height: 52vh;
  object-fit: contain;
  display: block;
}

.rendering-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: var(--font-heading, monospace);
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-primary, #a66130);
  z-index: 10;
}

.spinner {
  font-size: 2rem;
  animation: bounce 0.8s infinite alternate;
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-8px); }
}

.share-feedback {
  font-family: var(--font-heading, monospace);
  font-size: 0.82rem;
  font-weight: bold;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
}

.share-feedback.success {
  background-color: #ecfdf5;
  color: #065f46;
  border: 1px solid #10b981;
}

.share-feedback.error {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #ef4444;
}

.modal-actions-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  width: 100%;
  flex-wrap: wrap;
}

@media (max-width: 480px) {
  .modal-actions-footer {
    flex-direction: column-reverse;
  }
  .modal-actions-footer button {
    width: 100%;
  }
}
</style>
