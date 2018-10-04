(function(){

    const fboFrag = `
        // simulation
        varying vec2 vUv;
        
        uniform sampler2D tPositions;
        uniform sampler2D origin;
        
        uniform float timer;
        uniform vec3 velocity;
        
        vec4 mod289(vec4 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0; 
        }
        
        float mod289(float x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0; 
        }
        
        vec4 permute(vec4 x) {
        return mod289(((x*34.0)+1.0)*x);
        }
        
        float permute(float x) {
        return mod289(((x*34.0)+1.0)*x);
        }
        
        vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        float taylorInvSqrt(float r) {
        return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        vec4 grad4(float j, vec4 ip){
        const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
        vec4 p,s;
        
        p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
        p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
        s = vec4(lessThan(p, vec4(0.0)));
        p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 
        
        return p;
        }
        
        // (sqrt(5) - 1)/4 = F4, used once below
        #define F4 0.309016994374947451
        
        float snoise(vec4 v) {
        const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
                        0.276393202250021,  // 2 * G4
                        0.414589803375032,  // 3 * G4
                        -0.447213595499958); // -1 + 4 * G4
        
        // First corner
        vec4 i  = floor(v + dot(v, vec4(F4)) );
        vec4 x0 = v -   i + dot(i, C.xxxx);
        
        // Other corners
        
        // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
        vec4 i0;
        vec3 isX = step( x0.yzw, x0.xxx );
        vec3 isYZ = step( x0.zww, x0.yyz );
        //  i0.x = dot( isX, vec3( 1.0 ) );
        i0.x = isX.x + isX.y + isX.z;
        i0.yzw = 1.0 - isX;
        //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
        i0.y += isYZ.x + isYZ.y;
        i0.zw += 1.0 - isYZ.xy;
        i0.z += isYZ.z;
        i0.w += 1.0 - isYZ.z;
        
        // i0 now contains the unique values 0,1,2,3 in each channel
        vec4 i3 = clamp( i0, 0.0, 1.0 );
        vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
        vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );
        
        //  x0 = x0 - 0.0 + 0.0 * C.xxxx
        //  x1 = x0 - i1  + 1.0 * C.xxxx
        //  x2 = x0 - i2  + 2.0 * C.xxxx
        //  x3 = x0 - i3  + 3.0 * C.xxxx
        //  x4 = x0 - 1.0 + 4.0 * C.xxxx
        vec4 x1 = x0 - i1 + C.xxxx;
        vec4 x2 = x0 - i2 + C.yyyy;
        vec4 x3 = x0 - i3 + C.zzzz;
        vec4 x4 = x0 + C.wwww;
        
        // Permutations
        i = mod289(i); 
        float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
        vec4 j1 = permute( permute( permute( permute (
            i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
            + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
            + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
            + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
        
        // Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
        // 7*7*6 = 294, which is close to the ring size 17*17 = 289.
        vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;
        
        vec4 p0 = grad4(j0,   ip);
        vec4 p1 = grad4(j1.x, ip);
        vec4 p2 = grad4(j1.y, ip);
        vec4 p3 = grad4(j1.z, ip);
        vec4 p4 = grad4(j1.w, ip);
        
        // Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        p4 *= taylorInvSqrt(dot(p4,p4));
        
        // Mix contributions from the five corners
        vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
        vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
        m0 = m0 * m0;
        m1 = m1 * m1;
        return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
                + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
        
        }
        
        void main() {
        vec3 pos = texture2D( tPositions, vUv ).xyz;
        
        pos.x += snoise(vec4(pos.x, pos.y, pos.z, timer/10000.0)) * 0.01;
        pos.y += snoise(vec4(pos.x, pos.y, pos.z, 1.352+timer/10000.0)) * 0.01;
        pos.z += snoise(vec4(pos.x, pos.y, pos.z, 12.352+timer/10000.0)) * 0.01;
        // Write new position out
        gl_FragColor = vec4(pos, 1.0);
        }    
    `
    const fboRenderFrag = `
        uniform sampler2D map;
        uniform float effector;

        varying vec2 vUv;
        varying vec4 vPosition;

        void main() {
        gl_FragColor = vec4( 1.0,1.0,1.0,0.2 );
        gl_FragColor *= 1.5;
        }
    `

    const fboRenderVert = `
        uniform sampler2D map;

        uniform float width;
        uniform float height;

        uniform float pointSize;

        varying vec2 vUv;
        varying vec4 vPosition;

        // Pseudo random number generator
        float rand(vec2 co) {
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }


        void main(){

        vUv = position.xy + vec2( 0.5 / width, 0.5 / height );

        vec3 position = ( texture2D( map, vUv ).rgb  );

        gl_PointSize = 2.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

        }
    `

    const fboVert = `
        varying vec2 vUv;
        void main() {
            vUv = vec2(uv.x, uv.y);
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `

    var camera, scene;
    var geometry, material, mesh, material;
    var texSize = 512;
    var dispSize = {x:window.innerWidth, y:window.innerHeight};
    var data;
    var texture;
    var simulationShader;
    var rtTexturePos, rtTexturePos2;
    var fboParticles;
    var renderer = new THREE.WebGLRenderer();
    var timer=0;
    var stats;

    function init() {
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.z = 2;

        scene = new THREE.Scene();

        // INIT FBO
        var data = new Float32Array( texSize * texSize * 3 );
        for (var i=0; i<data.length; i+=3){
            data[i] = Math.sin(i) ;
            data[i+1] = Math.cos(i) ;
            data[i+2] = 0.0;
        }
        texture = new THREE.DataTexture( data, texSize, texSize, THREE.RGBFormat, THREE.FloatType );
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;

        rtTexturePos = new THREE.WebGLRenderTarget(texSize, texSize, {
            wrapS:THREE.RepeatWrapping,
            wrapT:THREE.RepeatWrapping,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBFormat,
            type:THREE.FloatType,
            stencilBuffer: true
        });

        rtTexturePos2 = rtTexturePos.clone();

        simulationShader = new THREE.ShaderMaterial({

            uniforms: {
                tPositions: { type: "t", value: texture },
                origin: { type: "t", value: texture },
                timer: { type: "f", value: 0}
            },

            vertexShader: fboVert,
            fragmentShader:  fboFrag

        });

        fboParticles = new THREE.FBOUtils( texSize, renderer, simulationShader );
        fboParticles.renderToTexture(rtTexturePos, rtTexturePos2);

        fboParticles.in = rtTexturePos;
        fboParticles.out = rtTexturePos2;

        geometry = new THREE.BufferGeometry();
        var vertices = [];
        var sizes = [];
        for ( var i = 0, l = texSize * texSize; i < l; i ++ ) {

            var vertex = new THREE.Vector3();
            vertex.x = Math.sin( i ) * texSize/2;
            vertex.y = Math.cos( i ) * texSize/2;
            vertex.z = Math.sin( i ) * 2;
            vertices.push( vertex.x );
            vertices.push( vertex.y );
            vertices.push( vertex.z );
            sizes.push( 20 );
        }
        geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
        geometry.addAttribute( 'size', new THREE.Float32BufferAttribute( sizes, 1 ).setDynamic( true ) );
        material = new THREE.ShaderMaterial( {

            uniforms: {

                "map": { type: "t", value: rtTexturePos },
                "width": { type: "f", value: texSize },
                "height": { type: "f", value: texSize },
                "pointSize": { type: "f", value: 3 },
                "effector" : { type: "f", value: 0 }

            },
            vertexShader: fboRenderVert,
            fragmentShader: fboRenderFrag,
            depthTest: true,
            transparent: true,
            blending: THREE.AdditiveBlending
        } );

        mesh = new THREE.PointCloud( geometry, material );
        scene.add( mesh );

        renderer.setSize(window.innerWidth, window.innerHeight);
        // Stats
        stats = new Stats();
                              
        document.body.appendChild(renderer.domElement);
        document.body.appendChild(stats.domElement);
    }

    function animate(t) {
        requestAnimationFrame(animate);

        simulationShader.uniforms.timer.value = t;

        // swap
        var tmp = fboParticles.in;
        fboParticles.in = fboParticles.out;
        fboParticles.out = tmp;
        
        simulationShader.uniforms.tPositions.value = fboParticles.in;
        fboParticles.simulate(fboParticles.out);
        material.uniforms.map.value = fboParticles.out;
        renderer.render( scene, camera );
        stats.update();
    }


    init();
    animate(new Date().getTime());
})();
