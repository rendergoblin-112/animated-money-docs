// The set library. A project names the sets it uses in project.json "sets" (in build order) with each set's config.
// Every set: make(cfg, ctx) -> { scene, cards, update(st), anchors? }. See references/06-sets-and-colour.md for what each holds.
import { makeCity } from './city.js';
import { makeFloor } from './floor.js';
import { makeServer } from './server.js';
import { makeRack } from './rack.js';
import { makeDesk } from './desk.js';
import { makeDen } from './den.js';
import { makeCourt } from './court.js';

export const SETS = { city: makeCity, floor: makeFloor, server: makeServer, rack: makeRack, desk: makeDesk, den: makeDen, court: makeCourt };
