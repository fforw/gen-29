import domready from "domready"
import "./style.css"
import weightedRandom from "./weightedRandom";
import Color from "./Color";

import palettes from "./colors-all.json";


const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;
const DEG2RAD_FACTOR = TAU / 360;

const config = {
    width: 0,
    height: 0
};

/**
 * @type CanvasRenderingContext2D
 */
let ctx;
let canvas;

const ops = weightedRandom([
    2, () => {
        const { size, width, height } = config;
        const angle = Math.random() * TAU;
        const r = size * Math.pow(Math.random(), 0.5)

        const x = 0 | (width / 2 + Math.cos(angle) * r);
        const y = 0 | (height / 2 + Math.sin(angle) * r);

        const rnd = Math.random();
        const r2 = size * 0.5 * rnd * rnd

        ctx.beginPath()
        ctx.moveTo(x + r2, y)
        ctx.arc(x,y, r2, 0, TAU, true)
        ctx.fill();
    },
    1, () => {
        const { size, width, height } = config;
        const angle = Math.random() * TAU;
        const r = size * Math.pow(Math.random(), 0.5)

        const x = 0 | (width / 2 + Math.cos(angle) * r);
        const y = 0 | (height / 2 + Math.sin(angle) * r);

        const rnd = Math.random();
        const r2 = size * 0.5 * rnd * rnd

        ctx.beginPath()
        ctx.moveTo(x + r2, y)
        ctx.arc(x,y, r2, 0, TAU, true)
        ctx.stroke();
    },
    2, () => {
        const {size, width, height} = config;
        const angle = Math.random() * TAU;
        const r = size * Math.pow(Math.random(), 0.5)

        let tmp
        let dx = Math.cos(angle);
        let dy = Math.sin(angle);

        let x = 0 | (width / 2 + dx * r);
        let y = 0 | (height / 2 + dy * r);

        const rnd = Math.random();
        const rnd2 = Math.random();

        const s = size * 0.125

        let r2 = s + s * rnd * rnd * rnd
        let r3 = s + s * rnd2 * rnd2 * rnd2

        ctx.beginPath()
        for (let i = 0; i < 4; i++)
        {
            tmp = dx
            dx = dy
            dy = -tmp

            const x2 = x + dx * r2
            const y2 = y + dy * r2

            if (i === 0)
            {
                ctx.moveTo(x2, y2)
            }
            else
            {
                ctx.lineTo(x2, y2)
            }

            // tmp2 = r2
            // r2 = r3
            // r3 = tmp2
        }
        ctx.fill()
    }
])


function createHistogram(imageData)
{

    const { width, height } = config;

    const histogram = new Map();
    const {data} = imageData
    let off = 0;
    for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            const r = data[off]
            const g = data[off + 1]
            const b = data[off + 2]

            const color = new Color(r, g, b).toRGBHex();
            histogram.set(color, (histogram.get(color) || 0) + 1)

            off += 4;
        }
    }

    const cutoff = width*height*0.01;

    for (let [color,num] of histogram.entries())
    {
        if (num < cutoff)
        {
            histogram.delete(color)
        }
    }
    
    return histogram;
}


function toLinear(value)
{
    return Math.pow(value, 2.4)
}


const black = new Color(0,0,0)
const tmp = new Color(0,0,0)
function colorize(imageData, histogram, palette, noise, noise2)
{
    const { width, height } = config;

    const cols = []
    let index = 0;
    for (let color of histogram.keys())
    {
        cols.push({
            src: Color.from(color),
            dst: Color.from(palette[index++])
        })
    }

    const {data} = imageData
    let off = 0;
    for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            const r2 = data[off    ]
            const g2 = data[off + 1]
            const b2 = data[off + 2]

            let min = Infinity;
            let best;
            for (let i = 0; i < cols.length; i++)
            {
                const { src, dst } = cols[i];

                const dx = src.r - r2;
                const dy = src.g - g2;
                const dz = src.b - b2;

                const dSq = dx * dx + dy * dy + dz * dz;
                if (dSq < min)
                {
                    min = dSq
                    best = dst
                }
            }

            const v = Math.random()
            const isNoise = best.r === noise.r && best.g === noise.g && best.b === noise.b;
            best.mix(isNoise ? noise2 : noise, v * v * (isNoise ? 0.5 : 0.25), tmp)

            data[off    ] = tmp.r
            data[off + 1] = tmp.g
            data[off + 2] = tmp.b

            off += 4
        }
    }
}


domready(
    () => {

        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;
        config.size = Math.max(width,height)/2

        canvas.width = width;
        canvas.height = height;


        const paint = () => {

            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, width, height);

            ctx.lineWidth = 0|(config.size / 100)
            ctx.strokeStyle = ctx.fillStyle = `rgba(255,255,255,${1 / 16})`;

            const numOp = 30 + Math.random() * 30;
            for (let i = 0; i < numOp; i++)
            {
                ops();
            }
            const imageData = ctx.getImageData(0, 0, width, height);
            const histogram = createHistogram(imageData);

            //console.log("histogram", histogram, width, height)

            let qualified = palettes.filter(p => p.length === histogram.size)
            if (!qualified.length)
            {
                qualified = palettes.filter(p => p.length >= histogram.size)
                if (!qualified.length)
                {
                    paint()
                    return
                }
            }
            const p = qualified[0|qualified.length * Math.random()]
            colorize(imageData, histogram, p, Color.from(p[0|p.length * Math.random()]), Color.from(p[0|p.length * Math.random()]))
            ctx.putImageData(imageData, 0, 0)
        };
        paint();

        window.addEventListener("click", paint, true)
    }
);
