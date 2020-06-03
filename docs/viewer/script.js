"use strict";

const $ = selector => {
    return document.querySelector(selector);
};
const $$ = selector => {
    return document.querySelectorAll(selector);
};

const canvas = $('canvas');
const context = canvas.getContext('2d', {alpha: false});

const imageData = context.createImageData(canvas.width, canvas.height);
let data = imageData.data;  // : Uint8ClampedArray

let data_view = null; // would be an instance of DataView

const load_nth_image = n => {  // 1-based
    const offset = 16 + 28 * 28 * (n - 1);

    for (let i = 0; i < 28 * 28; i++) {
        let d = data_view.getUint8(offset + i);
        data[4 * i] = data[4 * i + 1] = data[4 * i + 2] = d;
    }

    context.putImageData(imageData, 0, 0);
};

const n_images_in_each_page = 800;

const build_pages = (n_start = 1, n_end = 10) => {
    const pages = [...Array(n_end - n_start + 1).keys()].map(p => p + n_start);
    const splitted = pages.reduce((splitted, n) => {
        if (n % n_images_in_each_page === 1) {
            splitted.push([n]);
        } else {
            splitted.slice(-1)[0].push(n);
        }
        return splitted;
    }, []);

    splitted.forEach(image_nums => {
        const section = document.createElement('section');
        section.classList.add('page');
        
        const h1 = document.createElement('h1');
        const n_start = image_nums[0];
        const n_end = image_nums.slice(-1)[0];
        h1.textContent = `${n_start} - ${n_end}`;

        const div = document.createElement('div');

        section.appendChild(h1);
        section.appendChild(div);
        document.body.appendChild(section);

        const images_elm = Array.from($$('.page > div')).slice(-1)[0];

        image_nums.forEach(n => {
            let img = document.createElement('img');

            img.classList.add('figure');
            img.id = `fig-${n}`;

            images_elm.appendChild(img);
        })
    })
};

const render2 = async (n_start = 1, n_end = 10) => {
    for (let n = n_start; n <= n_end; n++) {
        load_nth_image(n);
        let blob = await new Promise(resolve => canvas.toBlob(resolve));
        let url = URL.createObjectURL(blob);

        $(`#fig-${n}`).src = url;
    }
};

const clear_outputs = () => {    
    $$('.page').forEach(page => page.remove());
};


const main = () => {
    build_pages(1, +$('#inputnumber > input').value);
    render2(1, +$('#inputnumber > input').value);
};

/**
 * Event Listners
 */
$('body').addEventListener('dragover', e => {
    e.stopPropagation();
    e.preventDefault();
    $('body').classList.add('ondragging');
});

$('body').addEventListener('drop', e => {
    e.stopPropagation();
    e.preventDefault();
    const reader = new FileReader();

    $('body').classList.remove('ondragging');

    reader.addEventListener('load', e => {
        data_view = new DataView(reader.result);
        main();
    }, {
        once: true
    });

    reader.readAsArrayBuffer(e.dataTransfer.files[0]);
});

$('#inputnumber > button').addEventListener('click', e => {
    const n_end = +$('#inputnumber > input').value;
    clear_outputs();
    build_pages(1, n_end);

    render2(1, n_end);
});
