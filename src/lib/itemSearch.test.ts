import { describe, expect, it } from 'vitest';
import { searchItems, matchingTags } from './itemSearch';

type Row = { name: string; tags?: string[] };

const cucumber: Row = { name: 'Cucumber', tags: ['Produce', 'Vegetables'] };
const lettuce: Row = { name: 'Lettuce', tags: ['Produce', 'Vegetables'] };
const milk: Row = { name: 'Milk', tags: ['Dairy'] };
const items: Row[] = [cucumber, lettuce, milk];

describe('searchItems', () => {
  it('returns the input untouched for an empty query', () => {
    expect(searchItems(items, '')).toBe(items);
    expect(searchItems(items, '   ')).toBe(items);
  });

  it('matches on name substrings', () => {
    expect(searchItems(items, 'cuc')).toEqual([cucumber]);
  });

  it('matches on tags, surfacing items whose name does not contain the term', () => {
    const result = searchItems(items, 'veg');
    expect(result).toContain(cucumber);
    expect(result).toContain(lettuce);
    expect(result).not.toContain(milk);
  });

  it('requires every whitespace-separated term to match (AND)', () => {
    expect(searchItems(items, 'veg cuc')).toEqual([cucumber]);
    expect(searchItems(items, 'veg dairy')).toEqual([]);
  });

  it('ranks name matches above tag-only matches', () => {
    // "produce" is a tag on cucumber+lettuce; add an item literally named
    // "Produce Bag" so the name match should sort first.
    const bag: Row = { name: 'Produce Bag', tags: ['Household'] };
    const result = searchItems([cucumber, lettuce, bag], 'produce');
    expect(result[0]).toBe(bag);
  });

  it('keeps original order for equal scores (stable)', () => {
    expect(searchItems(items, 'produce')).toEqual([cucumber, lettuce]);
  });
});

describe('matchingTags', () => {
  it('returns only the tags that matched the query', () => {
    expect(matchingTags(cucumber, 'veg')).toEqual(['Vegetables']);
  });

  it('returns nothing for an empty query', () => {
    expect(matchingTags(cucumber, '')).toEqual([]);
  });

  it('returns nothing when only the name matched', () => {
    expect(matchingTags(cucumber, 'cuc')).toEqual([]);
  });
});
