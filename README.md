# 🎲 Cubo Mágico 3D (Rubik's Cube Simulator)

Um simulador interativo, moderno e ultrarrápido de Cubo Mágico 3D construído com **Three.js** e **Vite**. Desenvolvido com foco em alta fidelidade visual (estilo *stickerless* GAN), jogabilidade fluida com gestos de mouse e suporte completo aos padrões da WCA (World Cube Association).

---

## ✨ Funcionalidades Principais

- 🧩 **Interação 3D Realista**:
  - Gire fatias e camadas arrastando diretamente sobre as peças 3D.
  - Órbita livre da câmera para inspecionar qualquer ângulo do cubo.
  - **Modo Travar Visão (Tecla `T`)**: Fixa o cubo com a face branca para baixo e amarela para o topo, permitindo apenas giros laterais para facilitar a resolução.
- ⚡ **Desempenho Extremo (Render On-Demand)**:
  - Consumo de **0% de CPU/GPU** quando inativo (renderiza apenas durante movimentos de peças ou rotação da câmera).
  - Geometrias e chanfros de azulejos otimizados para máxima taxa de quadros (60/144 FPS).
- 🎮 **Controles Completos**:
  - **Atalhos de Teclado WCA**: Faces externas (`U`, `D`, `L`, `R`, `F`, `B`), fatias centrais (`M`, `E`, `S`) e rotações do cubo inteiro (`X`, `Y`, `Z`).
  - Suporte a giros invertidos/anti-horário (*Prime*) via `Shift` e giros duplos (`180°`).
- ⏱️ **Modo Desafio**:
  - Contador de movimentos em tempo real.
  - Cronômetro automático acionado no primeiro movimento.
  - Função de **Embaralhar** com algoritmo aleatório e **Resolver** automático através da inversão do histórico.

---

## 🛠️ Tecnologias Utilizadas

- **[Three.js](https://threejs.org/)** — Renderização 3D WebGL e física de rotações/quaternions.
- **[Vite](https://vitejs.dev/)** — Ferramenta de build rápida e servidor de desenvolvimento moderno.
- **JavaScript Moderno (ES6+)** — Arquitetura modular e sem dependências pesadas.
- **CSS3 Puro** — Design *Glassmorphism*, tipografia Google Fonts (*Outfit*) e layout responsivo.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada)

### Passos

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/Luskinha01-cyber/Cubo-Magico-3D.git
   cd Cubo-Magico-3D
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. Acesse no seu navegador em `http://localhost:5173`.

---

## ⌨️ Tabela de Atalhos de Teclado

| Tecla | Ação |
| :---: | :--- |
| `U`, `D`, `L`, `R`, `F`, `B` | Gira a respectiva face no sentido horário |
| `Shift` + Tecla de Face | Gira a respectiva face no sentido anti-horário (*Prime*) |
| `M`, `E`, `S` | Gira as fatias do meio (*Middle*, *Equator*, *Standing*) |
| `T` | Trava / Destrava a visão vertical |
| `Espaço` | Embaralhar o cubo |
| `Esc` | Reiniciar o cubo para o estado montado |

---

## 📄 Licença

Distribuído sob a licença MIT. Sinta-se livre para utilizar, estudar e modificar!
