"""extractor/retract.py: a speaker taking back their own advice puts it under review (late rule, revert with the module)."""
from extractor.merge import merge
from extractor.retract import retract
from test_extractor import TOPO, bounce


def stored():
    return merge([], bounce(), TOPO)


def retraction(said_by="Erkki Expert", action="interface.bounce"):
    r = bounce(source="teams:thread-15_retraction", action=action)
    r.evidence.said_by = said_by
    return r


def test_own_retraction_sets_review_and_adds_source_only():
    old = stored()
    out = retract(old, retraction())
    a, = out
    assert a.status == "review" and a.evidence.sources == ["teams:thread-001", "teams:thread-15_retraction"]
    assert (a.superseded_by, a.valid_to, a.evidence.cases, a.trust) == (None, None, old[0].evidence.cases, old[0].trust)
    assert old[0].status == "open"  # input not mutated


def test_other_speaker_is_not_a_retraction():
    assert retract(stored(), retraction(said_by="Sanna Expert")) == stored()


def test_no_matching_assertion_is_dropped():
    assert retract(stored(), retraction(action="node.reboot")) == stored()
    assert retract([], retraction()) == []
